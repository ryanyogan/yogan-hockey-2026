import { exports } from "cloudflare:workers";
import {
  createDb,
  getPieceBySlug,
  getPredictions,
  getSeasonPicks,
  savePiece,
} from "@yogan-hockey/db";
import { getGameSummary, getScoreboard, getStandings } from "@yogan-hockey/espn";
import { type Game, pieceSlug, type StoredPiece, type WritingFacts } from "@yogan-hockey/schemas";
import { Agent, getAgentByName } from "agents";
import { seasonOfSlate } from "../lib/picks";
import { SCOREBOARD_CONNECTION } from "../lib/scoreboard-connection";
import { AI_GATEWAY_ID } from "./prediction";
import { withTimeout } from "./with-timeout";
import { checkPiece } from "./writing/check";
import { dayBefore, easternDate, type FactSources, writingFacts } from "./writing/facts";
import {
  EDITIONS,
  type Edition,
  type PieceKind,
  readDraft,
  WRITING_DAILY_MODEL_CALLS,
  WRITING_MODEL_OF_EACH_CALL,
  type WritingRequest,
  writingRequest,
} from "./writing/kinds";

/** The one instance of the Writer. */
export const WRITER_NAME = "writer";

/**
 * Before the slate: 15:00 UTC every day, which is 11 a.m. Eastern in summer and 10 a.m. in
 * winter. The earliest NHL start is an afternoon one.
 */
export const MORNING_CRON = "0 15 * * *";
/**
 * After the last final: the first look is at 05:00 UTC, 1 a.m. Eastern in summer and midnight in
 * winter, when an early slate is over. A slate with a late game on the west coast is looked at
 * again until it is.
 */
export const NIGHT_CRON = "0 5 * * *";
/** How long the morning waits, after waking the Scoreboard, for the day's Predictions to be made. */
export const PICKS_WAIT_SECONDS = 15 * 60;
/** How long the night waits before it looks again at a slate that is not finished. */
export const NIGHT_LOOK_SECONDS = 20 * 60;
/** How many times the night looks again: six hours, after which it writes up the finals there are. */
export const NIGHT_LOOKS = 18;
/** At the night's first look the slate is the day's that began this long ago, whatever the season. */
const NIGHT_BEHIND_MS = 6 * 60 * 60 * 1000;

/** Storage key prefix of a piece still to be written, followed by its slug. */
const JOB_PREFIX = "job:";
/** Storage key of the count of model calls made on one UTC day. */
const MODEL_CALLS_KEY = "model-calls";

/** One writing of the day's pieces, as its timer is handed it. */
type EditionRun = { edition: Edition; date: string; looks: number };
/**
 * A piece still to be written, kept in storage until it is published or given up on. Everything
 * a restart must not lose is here: the facts every try is given, and how many tries it has had.
 */
type Job = {
  slug: string;
  kind: string;
  date: string;
  facts: WritingFacts;
  /** Model calls made for this piece: the index into `WRITING_MODEL_OF_EACH_CALL` of the next. */
  calls: number;
  /** What the check found in the last try, which the next try is told. */
  refused: string[];
};
type ModelCalls = { date: string; count: number };
/** What an edition is written from, and whether the slate it reads has games still to finish. */
export type EditionSources = FactSources & { unfinished: boolean };

/**
 * The Writer (#217): two or three short pieces a day on the league, and up to three columns on the
 * site's picks for the Picks page (#218), written by a model from facts the site holds, checked against those facts (`writing/check.ts`) and stored in D1. One instance.
 * Nothing connects to it and it holds no state a page is sent: pages read its pieces from D1.
 *
 * It runs on two cron schedules of its own, set when it starts: `morning`, before the slate, for
 * the preview, the note on the league and the columns, and `night`, after the last final, for the recap. Each
 * only works out what there is to write and notes it in storage; `writeNext` then makes one model
 * call per run, as the Scoreboard does for its Predictions.
 *
 * It is a separate Agent so that nothing here can hold up the Scoreboard: a model call that hangs
 * or throws is this Agent's timer and nobody else's. A piece that fails the check is stored as
 * rejected and never read by a page, so the last good piece of its kind stays up.
 */
export class WriterAgent extends Agent<Env> {
  /** Sets the two schedules. Safe on every start: a cron schedule is made once. */
  override async onStart(): Promise<void> {
    const wanted = { morning: MORNING_CRON, night: NIGHT_CRON } as const;
    // A schedule left by an earlier deploy with another hour would run beside the new one.
    for (const schedule of await this.listSchedules({ type: "cron" })) {
      const cron = wanted[schedule.callback as keyof typeof wanted];
      if (cron !== undefined && schedule.type === "cron" && schedule.cron !== cron) {
        await this.cancelSchedule(schedule.id);
      }
    }
    await this.schedule(MORNING_CRON, "morning");
    await this.schedule(NIGHT_CRON, "night");
  }

  /**
   * Starts the Agent if it is not running, which is all it takes for the schedules to be set.
   * The Worker calls this once per isolate (`wakeWriterOnce`), so the first request after the
   * deploy that adds the Writer is what sets it going. Answers with the schedules it has.
   */
  async wake(): Promise<{ callback: string; cron: string }[]> {
    const schedules = await this.listSchedules({ type: "cron" });
    return schedules.flatMap((schedule) =>
      schedule.type === "cron" ? [{ callback: schedule.callback, cron: schedule.cron }] : [],
    );
  }

  /**
   * A schedule's callback, not for calling. Before the slate: wakes the Scoreboard, as a visitor
   * would, so that the day's games are seen and their Predictions made, then writes the morning's
   * pieces once those have had time to land.
   */
  async morning(): Promise<void> {
    const run: EditionRun = { edition: "morning", date: easternDate(Date.now()), looks: 0 };
    try {
      await this.wakeScoreboard();
    } catch (error) {
      // The pieces are still written: games with no Prediction are previewed without a pick.
      console.error("Writer: the Scoreboard was not woken", error);
    }
    await this.schedule(PICKS_WAIT_SECONDS, "writeEdition", run);
  }

  /** A schedule's callback, not for calling. After the last final: writes the night's piece. */
  async night(): Promise<void> {
    const date = easternDate(Date.now() - NIGHT_BEHIND_MS);
    await this.writeEdition({ edition: "night", date, looks: 0 });
  }

  /**
   * A timer's callback, not for calling. Reads the facts for one edition and notes each piece
   * there is to write: a kind with nothing to write from is passed over (no games, no recap), and
   * so is one already published for the date. At night, a slate with a game still to finish is
   * looked at again later, `NIGHT_LOOKS` times at most. It never throws: a schedule's callback
   * that throws is run again.
   */
  async writeEdition(run: EditionRun): Promise<void> {
    const { edition, date, looks } = run;
    try {
      const sources = await this.gatherSources(edition, date);
      if (edition === "night" && sources.unfinished && looks < NIGHT_LOOKS) {
        const again: EditionRun = { ...run, looks: looks + 1 };
        await this.schedule(NIGHT_LOOK_SECONDS, "writeEdition", again);
        return;
      }
      const facts = writingFacts(sources);
      const db = createDb(this.env.DB);
      // A piece left waiting from another day is not written now as if it were today's.
      for (const [key, job] of this.#jobs()) if (job.date !== date) this.ctx.storage.kv.delete(key);
      for (const kind of EDITIONS[edition] as readonly PieceKind[]) {
        const slug = pieceSlug(date, kind.kind);
        // One kind that cannot be started (a column's figures, say) leaves the others their turn.
        try {
          const given = kind.facts(facts);
          if (given === null || (await getPieceBySlug(db, slug)) !== null) continue;
          const job: Job = { slug, kind: kind.kind, date, facts: given, calls: 0, refused: [] };
          this.ctx.storage.kv.put(JOB_PREFIX + slug, job);
        } catch (error) {
          console.error(`Writer: ${slug} was not started`, error);
        }
      }
    } catch (error) {
      console.error(`Writer: the ${edition} pieces for ${date} were not started`, error);
    }
    // Whatever was noted before a failure is still written.
    try {
      if (this.#jobs().length > 0) {
        await this.schedule(0, "writeNext", undefined, { idempotent: true });
      }
    } catch (error) {
      console.error("Writer: the waiting pieces were not set going", error);
    }
  }

  /**
   * A timer's callback, not for calling. Makes one model call for one piece, reads the answer
   * through the check, and stores it: published when it passes, rejected with the reasons when it
   * does not. A piece gets `WRITING_MODEL_OF_EACH_CALL.length` tries, each told what the check
   * found in the one before; after the last it is given up on and the last good piece of its kind
   * stays up. Sets itself again while pieces are waiting. It never throws.
   */
  async writeNext(): Promise<void> {
    try {
      const [next] = this.#jobs();
      if (!next) return;
      if (this.#modelCallsToday() >= WRITING_DAILY_MODEL_CALLS) {
        for (const [key] of this.#jobs()) this.ctx.storage.kv.delete(key);
        console.error("Writer: the day's model calls are spent, and what was waiting is dropped");
        return;
      }
      await this.#writeOnce(...next);
      if (this.#jobs().length > 0) await this.schedule(0, "writeNext");
    } catch (error) {
      console.error("Writer: a piece's try was not finished", error);
    }
  }

  /**
   * What an edition is written from, all of it the site's own reads: ESPN through the one module
   * every read goes through, and the Predictions from D1. A read that fails leaves its part out
   * (no standings, no finals) and the pieces that need it are not written; nothing is made up in
   * its place. The morning reads last night's finals and today's slate; the night reads the
   * slate of the day that is ending, with each final's scoring.
   */
  async gatherSources(edition: Edition, date: string): Promise<EditionSources> {
    const read = async <Value>(what: string, reading: () => Promise<Value>) => {
      try {
        return await reading();
      } catch (error) {
        console.error(`Writer: ${what} could not be read`, error);
        return null;
      }
    };
    const standings = await read("the standings", () => getStandings());
    const slateRead = await read(`the slate of ${date}`, () => getScoreboard(date));
    const slate = slateRead?.games ?? [];
    let finals: FactSources["finals"];
    if (edition === "night") {
      finals = [];
      for (const game of slate.filter(isFinal)) {
        const summary = await read(`game ${game.id}'s scoring`, () => getGameSummary(game.id));
        finals.push({ game, plays: summary?.plays ?? null });
      }
    } else {
      const yesterday = dayBefore(date);
      const played = await read(`the slate of ${yesterday}`, () => getScoreboard(yesterday));
      finals = (played?.games ?? []).filter(isFinal).map((game) => ({ game, plays: null }));
    }
    const ids = [...slate, ...finals.map(({ game }) => game)].map(({ id }) => id);
    const predictions =
      (await read("the Predictions", () => getPredictions(createDb(this.env.DB), ids))) ??
      new Map();
    // The Picks page's columns are the morning's, and so are the season's picks they are told.
    const seasonPicks =
      edition === "morning"
        ? await read("the season's picks", () =>
            getSeasonPicks(createDb(this.env.DB), seasonOfSlate(date)),
          )
        : null;
    // A slate that could not be read is not a finished one: the night looks again.
    const unfinished =
      slateRead === null || slate.some(({ status }) => status === "scheduled" || status === "live");
    return { date, standings, finals, slate, predictions, seasonPicks, unfinished };
  }

  /** Asks the Scoreboard for today's games, which makes it look at ESPN if it has not lately. */
  protected async wakeScoreboard(): Promise<void> {
    const scoreboard = await getAgentByName(exports.ScoreboardAgent, SCOREBOARD_CONNECTION.name);
    await scoreboard.getScoreboard();
  }

  /**
   * The one place a model is called: Workers AI through the Worker's binding, by way of AI
   * Gateway, which keeps the log of prompts and answers. A test replaces `env.AI`.
   */
  protected async runModel(model: string, request: WritingRequest, slug: string) {
    const gateway = { id: AI_GATEWAY_ID, skipCache: true, metadata: { piece: slug } };
    const ai = this.env.AI as unknown as {
      run(model: string, request: WritingRequest, options: object): Promise<unknown>;
    };
    return await ai.run(model, request, { gateway });
  }

  /** One try at one piece. */
  async #writeOnce(key: string, job: Job): Promise<void> {
    const { slug, facts } = job;
    const model = WRITING_MODEL_OF_EACH_CALL[job.calls];
    const kind = KINDS.find((known) => known.kind === job.kind);
    // Every call was made and the piece was not settled (a restart during the last one), or the
    // kind is one this deploy no longer writes.
    if (model === undefined || kind === undefined) {
      this.ctx.storage.kv.delete(key);
      return;
    }
    // Counted before the call is made, so a call cut short by a restart is still counted.
    job.calls += 1;
    this.ctx.storage.kv.put(key, job);
    this.#countModelCall();

    let published = false;
    try {
      const request = writingRequest(kind, facts, job.refused);
      const draft = readDraft(await withTimeout(this.runModel(model, request, slug)));
      if (!draft) {
        console.error(`Writer: ${model} gave ${slug} no piece`);
      } else {
        const reasons = checkPiece(draft, facts);
        const piece = {
          slug,
          kind: job.kind,
          date: job.date,
          headline: draft.headline,
          body: draft.paragraphs.join("\n\n"),
          writtenAt: new Date().toISOString(),
          model,
          writtenBy: "model",
          facts,
        } as const;
        const row: StoredPiece =
          reasons.length === 0
            ? { ...piece, status: "published" }
            : { ...piece, status: "rejected", reasons };
        await savePiece(createDb(this.env.DB), row);
        published = reasons.length === 0;
        if (!published) {
          job.refused = reasons;
          console.error(`Writer: ${slug} by ${model} failed the check: ${reasons.join("; ")}`);
        }
      }
    } catch (error) {
      console.error(`Writer: ${model} failed for ${slug}`, error);
    }

    if (published) {
      this.ctx.storage.kv.delete(key);
    } else if (job.calls >= WRITING_MODEL_OF_EACH_CALL.length) {
      this.ctx.storage.kv.delete(key);
      console.error(`Writer: ${slug} was given up on; the last good piece of its kind stays up`);
    } else {
      this.ctx.storage.kv.put(key, job);
    }
  }

  /**
   * Every piece still to be written, with its key, in the order the editions name their kinds:
   * Home's pieces before the Picks page's columns, whatever order storage lists the slugs in.
   */
  #jobs(): [string, Job][] {
    const order = KINDS.map(({ kind }) => kind);
    return [...this.ctx.storage.kv.list<Job>({ prefix: JOB_PREFIX })].sort(
      ([, a], [, b]) => order.indexOf(a.kind) - order.indexOf(b.kind),
    );
  }

  #modelCallsToday(): number {
    const calls = this.ctx.storage.kv.get<ModelCalls>(MODEL_CALLS_KEY);
    return calls?.date === today() ? calls.count : 0;
  }

  #countModelCall(): void {
    const calls: ModelCalls = { date: today(), count: this.#modelCallsToday() + 1 };
    this.ctx.storage.kv.put(MODEL_CALLS_KEY, calls);
  }
}

/** Every kind the Writer writes, the morning's and then the night's. */
const KINDS: readonly PieceKind[] = Object.values(EDITIONS).flat();
const isFinal = (game: Game) => game.status === "final";
/** The day the cap counts by. UTC's, so a night and the morning after it share one. */
const today = () => new Date().toISOString().slice(0, 10);
