// PROTOTYPE: one Agent per game. Polls ESPN's summary on a schedule, keeps the
// game's state, and every setState is pushed to connected viewers.
import { Agent } from "agents";
import { EMPTY, type GameState, type Play } from "./types";

const SUMMARY = "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/summary?event=";
const POLL_SECONDS = 10;
const KEEP = 40;
const REPLAY_STEP = 6; // plays revealed per tick when replaying a finished game

export class GameAgent extends Agent<unknown, GameState> {
  initialState = EMPTY;

  // In memory only: changes whenever the object is evicted or hibernated and woken.
  private bootId = crypto.randomUUID().slice(0, 8);

  // GET /agents/game-agent/<name>/boot: which in-memory instance is this, and who is connected?
  async onRequest() {
    return Response.json({ bootId: this.bootId, viewers: [...this.getConnections()].length, polls: this.state.polls, schedules: this.getSchedules().length });
  }

  // Called by the page's server component over Durable Object RPC.
  async watch(eventId: string, replay: boolean): Promise<GameState> {
    const mode = replay ? "replay" : "live";
    if (this.state.eventId !== eventId || this.state.mode !== mode) {
      for (const s of this.getSchedules()) await this.cancelSchedule(s.id);
      this.setState({ ...EMPTY, eventId, mode });
      await this.poll();
      await this.scheduleEvery(POLL_SECONDS, "poll");
    }
    return this.state;
  }

  async poll() {
    const s = this.state;
    if (!s.eventId) return;
    const started = Date.now();
    let lastPoll: GameState["lastPoll"];
    let next: Partial<GameState> = {};
    try {
      const res = await fetch(SUMMARY + s.eventId, { headers: { "user-agent": "yogan-hockey-prototype" } });
      const body = await res.text();
      lastPoll = {
        at: new Date().toISOString(),
        httpStatus: res.status,
        cacheControl: res.headers.get("cache-control"),
        bytes: body.length,
        fetchMs: Date.now() - started,
        colo: null,
        error: null,
      };
      if (res.ok) next = this.read(JSON.parse(body));
    } catch (e) {
      lastPoll = { at: new Date().toISOString(), httpStatus: 0, cacheControl: null, bytes: 0, fetchMs: Date.now() - started, colo: null, error: String(e) };
    }
    this.setState({ ...s, ...next, polls: s.polls + 1, lastPoll });
    if (this.state.finished) for (const sch of this.getSchedules()) await this.cancelSchedule(sch.id);
  }

  private read(j: any): Partial<GameState> {
    const s = this.state;
    const comp = j.header.competitions[0];
    const side = (h: string) => comp.competitors.find((c: any) => c.homeAway === h);
    const all: any[] = j.plays ?? [];
    const final = comp.status.type.completed === true;

    // Replay: pretend the finished game is in progress, a few plays per tick.
    const shown = s.mode === "replay" ? Math.min(all.length, s.totalPlays + REPLAY_STEP) : all.length;
    const visible = all.slice(0, shown);
    const last = visible[visible.length - 1];
    const plays: Play[] = visible.slice(-KEEP).reverse().map((p) => ({
      id: p.id,
      period: p.period?.displayValue ?? "",
      clock: p.clock?.displayValue ?? "",
      type: p.type?.text ?? "",
      text: p.text ?? "",
      goal: !!p.scoringPlay,
      x: p.coordinate?.x,
      y: p.coordinate?.y,
    }));
    const replaying = s.mode === "replay";
    return {
      status: replaying ? (shown < all.length ? `replay ${shown}/${all.length}` : "replay done") : comp.status.type.description,
      home: { abbr: side("home").team.abbreviation, score: replaying ? last?.homeScore ?? 0 : Number(side("home").score ?? 0) },
      away: { abbr: side("away").team.abbreviation, score: replaying ? last?.awayScore ?? 0 : Number(side("away").score ?? 0) },
      plays,
      totalPlays: shown,
      finished: replaying ? shown >= all.length : final,
    };
  }
}
