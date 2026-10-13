// PROTOTYPE (Agate). Draws Home and the Picks page from data.js with the sentences of copy.js.
// Address options: ?slate=tonight|busy  &theme=light|dark  &chrome=0 (hide the switcher)
// &at=Standings (the current section)
// Home: &news=0 (a day ESPN's news could not be read)  &pieces=0 (a day with no written piece)
// &pieces=1|2 (only so many of them)
// ?page=picks (the Picks page, #218): &figures=0 (before any pick is decided)
// &season=mid (a week, a run and a record as wide as they get)  &columns=0 (no column published)

import {
  agateName,
  BEST_CALL,
  bandLabel,
  briefGame,
  COLUMN_KINDS,
  COLUMNS_LABEL,
  callSentence,
  counts,
  deck,
  headline,
  kicker,
  leadsAndBriefs,
  noFigures,
  PICKS_LEDE,
  PICKS_TITLE,
  PIECES_LABEL,
  pickOutcome,
  pickSentence,
  pieceKicker,
  record,
  runWords,
  SIDE_LABELS,
  share,
  slateDay,
  spelled,
  TONIGHT_LABEL,
  tonightPicks,
  unbroken,
  WORST_CALL,
  WRITTEN_BY,
  weekLabel,
  weekSpan,
} from "./copy.js";
import { COLUMNS, NEWS, PICKS, PICKS_MID, PIECES, SLATES, STANDINGS } from "./data.js";

const params = new URLSearchParams(location.search);
const onPicks = params.get("page") === "picks";
const slateKey = params.get("slate") === "busy" ? "busy" : "tonight";
const slate = SLATES[slateKey];
const state = { conf: "east" };

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );

const SUN = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>`;
const MOON = `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>`;

// A page of the prototype's address, keeping the theme, the switcher and the slate.
function pageHref(page) {
  const p = new URLSearchParams();
  if (page) p.set("page", page);
  for (const key of ["slate", "theme", "chrome"]) {
    if (params.has(key)) p.set(key, params.get(key));
  }
  return `?${p}`;
}

// The theme's two buttons. They are written twice and drawn once: at the right end of the
// sections' bar at a desk, and at the end of the dateline on a phone, where the bar is full.
function themeControl(place, dark) {
  return `<div class="theme theme--${place}" role="group" aria-label="Theme">
        <button type="button" data-theme="light" aria-pressed="${!dark}">${SUN}<span class="theme__word">Day</span></button>
        <button type="button" data-theme="dark" aria-pressed="${dark}">${MOON}<span class="theme__word">Night</span></button>
      </div>`;
}

// The sections' bar first, hung from a heavy rule and stuck to the top of the screen: the date,
// the sections, Day/Night. Then the nameplate, and the dateline on the double rule. The sections
// are six, Picks (#218) the last. Home and Picks lead to the two pages drawn here, with the theme,
// the switcher and the slate as they are; `?at=Standings` marks another section as the current
// one. The nameplate is Home's `h1` and a paragraph on the Picks page, whose title is its own.
function masthead() {
  const c = counts(slate.games);
  const dark = document.documentElement.classList.contains("dark");
  const places = ["Home", "Scores", "Standings", "Teams", "Players", "Picks"];
  const at = params.get("at") ?? (onPicks ? "Picks" : "Home");
  const drawn = { Home: pageHref(null), Picks: pageHref("picks") };
  const nav = places
    .map(
      (n) => `<a href="${esc(drawn[n] ?? "#")}"${n === at ? ' aria-current="page"' : ""}>${n}</a>`,
    )
    .join("");
  const nameplate = onPicks ? "p" : "h1";
  // The dateline's record is the season's: on the Picks page, the one its figures print.
  const season = onPicks ? picksFigures().season : slate.record;
  return `
  <div class="section-row">
    <div class="section-row__inner">
      <p class="section-row__date">${esc(slate.date)}</p>
      <nav class="sections" aria-label="Main">${nav}</nav>
      ${themeControl("desk", dark)}
    </div>
  </div>
  <header class="masthead">
    <${nameplate} class="wordmark"><a href="${esc(pageHref(null))}">Yogan Hockey</a></${nameplate}>
    <p class="masthead__date">${esc(slate.date)}</p>
  </header>
  <div class="dateline">
    <div class="dateline__rules">
      <p class="dateline__inner">
        <span class="dateline__wide">Tonight: ${c.total} games${c.live ? ` · ${c.live} live` : ""}${c.toCome ? ` · ${c.toCome} to come` : ""}${c.final ? ` · ${c.final} final` : ""}</span>
        <span class="dateline__wide">Picks this season: ${season.right} right, ${season.wrong} wrong</span>
        <span class="dateline__narrow">${c.total} games${c.live ? ` · ${c.live} live` : ""}${c.final ? ` · ${c.final} final` : ""} · Picks ${season.right}–${season.wrong}</span>
      </p>
      ${themeControl("phone", dark)}
    </div>
  </div>`;
}

function lineScore(g) {
  const label = esc(headline(g));
  const played = g.status === "final" || g.status === "live";
  const head = played ? `<th scope="col" class="f">${g.status === "live" ? "Now" : "F"}</th>` : "";
  const side = (s) => {
    const strong =
      g.status === "final" && s.score === Math.max(g.away.score, g.home.score) ? " strong" : "";
    return `<tr><th scope="row" class="${strong.trim()}">${esc(agateName(s.abbr))}</th><td class="rec">${esc(s.record)}</td>${played ? `<td class="f${strong}">${s.score}</td>` : ""}</tr>`;
  };
  return `
  <table class="agate linescore">
    <caption class="sr-only">${label}: line score</caption>
    <thead><tr><th scope="col">Team</th><th scope="col" class="rec">Rec</th>${head}</tr></thead>
    <tbody>${side(g.away)}${side(g.home)}</tbody>
  </table>`;
}

function pickLine(g) {
  const sentence = pickSentence(g);
  if (!sentence) return "";
  const outcome = pickOutcome(g);
  const mark = outcome
    ? ` <span class="mark mark--${outcome}">${outcome === "right" ? "Right" : "Wrong"}</span>`
    : "";
  return `<p class="pick">${esc(sentence)}${mark}</p>`;
}

function story(g) {
  const live = g.status === "live";
  return `
  <article class="story${live ? " story--live" : ""}">
    <p class="kicker">${live ? '<span class="live-dot" aria-hidden="true"></span>' : ""}${esc(kicker(g))}</p>
    <h3 class="headline"><a href="#">${esc(headline(g))}</a></h3>
    <p class="deck">${esc(deck(g))}</p>
    ${lineScore(g)}
    ${pickLine(g)}
    <p class="tv"><strong>On TV</strong> ${esc(g.tv)}</p>
  </article>`;
}

// A brief: the game on one line, its status and its pick on the next. Home's are the games that
// do not lead; the Picks page's are the whole slate.
function briefRows(list) {
  return list
    .map((g) => {
      const status =
        g.status === "scheduled" ? g.start : g.status === "live" ? `Live · ${g.detail}` : g.detail;
      const outcome = pickOutcome(g);
      const pick = g.pick
        ? `${g.pick.team} ${g.pick.pct}%${outcome ? ` <span class="mark mark--${outcome}">${outcome === "right" ? "Right" : "Wrong"}</span>` : ""}`
        : '<span class="dim">No pick</span>';
      return `<li class="brief">
      <a class="brief__game" href="#">${esc(briefGame(g))}</a>
      <span class="brief__status${g.status === "live" ? " brief__status--live" : ""}">${esc(status)}</span>
      <span class="brief__pick">${pick}</span>
    </li>`;
    })
    .join("");
}

function briefs(list) {
  if (list.length === 0) return "";
  return `
  <section class="briefs" aria-labelledby="briefs-h">
    <h2 class="label" id="briefs-h">Around the league</h2>
    <ul class="brief-list">${briefRows(list)}</ul>
  </section>`;
}

// The written pieces (#217), in the leads' grid: what each is and its day, its headline (a link
// to its own page), its first paragraph cut at five lines, and that a model wrote it and when.
// With none (`?pieces=0`) the section is not drawn at all. The Picks page's columns are drawn the
// same, under a label of their own.
function pieces(list, label = PIECES_LABEL, id = "pieces-h") {
  if (list.length === 0) return "";
  const stories = list
    .map(
      (p) => `<article class="piece">
      <p class="piece__kicker">${esc(pieceKicker(p))}</p>
      <h3 class="piece__headline"><a href="#">${esc(unbroken(p.headline))}</a></h3>
      <p class="piece__deck">${esc(unbroken(p.paragraphs[0]))}</p>
      <p class="piece__byline">${esc(WRITTEN_BY)} · ${esc(p.when)}</p>
    </article>`,
    )
    .join("");
  return `
  <section class="pieces" aria-labelledby="${id}">
    <h2 class="label" id="${id}">${esc(label)}</h2>
    <div class="piece-list">${stories}</div>
  </section>`;
}

// ESPN's headlines (#217), each the whole of a link to ESPN. With none to list (`?news=0`) the
// section is not drawn at all, and the lower band follows the briefs as it did.
function news(list) {
  if (list.length === 0) return "";
  const rows = list
    .map(
      (n) => `<li class="news-item">
      <a href="${esc(n.url)}">
        <span class="news__headline">${esc(n.headline)}</span>
        <span class="news__when">${esc(n.when)}</span>
      </a>
    </li>`,
    )
    .join("");
  return `
  <section class="news" aria-labelledby="news-h">
    <h2 class="label" id="news-h">Headlines from ESPN</h2>
    <ul class="news-list">${rows}</ul>
  </section>`;
}

function confTable(key, title) {
  const rows = STANDINGS[key]
    .map((t) => {
      const gp = t.w + t.l + t.otl;
      return `<tr><td>${esc(agateName(t.abbr))}</td><td class="num dim">${gp}</td><td class="num">${t.w}</td><td class="num">${t.l}</td><td class="num">${t.otl}</td><td class="num strong">${t.pts}</td></tr>`;
    })
    .join("");
  return `
  <div class="conf conf--${key}">
    <h3 class="label" id="conf-${key}">${title}</h3>
    <table class="agate" aria-labelledby="conf-${key}">
      <thead><tr><th scope="col">Team</th><th scope="col" class="num">GP</th><th scope="col" class="num">W</th><th scope="col" class="num">L</th><th scope="col" class="num">OT</th><th scope="col" class="num">PTS</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function lower() {
  const c = counts(slate.games);
  const t = tonightPicks(slate.games);
  const total = slate.record.right + slate.record.wrong;
  const pctRight = total ? Math.round((slate.record.right / total) * 100) : 0;
  const tonight = t.decided ? ` ${spelled(t.right)} of ${spelled(t.decided, false)} tonight.` : "";
  return `
  <div class="lower">
    <section class="standings" aria-labelledby="stand-h" data-conf="${state.conf}">
      <div class="band-head">
        <h2 class="band-title" id="stand-h">Standings</h2>
        <a class="more" href="#">Full standings</a>
      </div>
      <div class="conf-tabs" role="group" aria-label="Conference">
        <button type="button" data-conf="east" aria-pressed="${state.conf === "east"}">Eastern</button>
        <button type="button" data-conf="west" aria-pressed="${state.conf === "west"}">Western</button>
      </div>
      <div class="confs">${confTable("east", "Eastern Conference")}${confTable("west", "Western Conference")}</div>
    </section>
    <aside class="aside" aria-label="Picks">
      <section class="picks-box" aria-labelledby="picks-h">
        <div>
          <h2 class="label" id="picks-h">The Picks</h2>
          <p class="picks-box__score">${slate.record.right}–${slate.record.wrong}</p>
        </div>
        <p class="picks-box__note">Right on ${pctRight}% of games this season.${tonight}</p>
      </section>
      <section class="glance" aria-labelledby="glance-h">
        <h2 class="label" id="glance-h">Tonight at a glance</h2>
        <div class="glance__grid">
          <div><div class="glance__n">${c.live}</div><div class="glance__k">Live</div></div>
          <div><div class="glance__n">${c.toCome}</div><div class="glance__k">To come</div></div>
          <div><div class="glance__n">${c.final}</div><div class="glance__k">Final</div></div>
        </div>
      </section>
    </aside>
  </div>`;
}

/* ---------- the Picks page (#218) ---------- */

// A red label over a plain rule, with a count beside it in quiet agate: the site's SectionHeader.
function sectionHead(id, title, count) {
  const quiet = count ? ` <span class="label__count">${esc(count)}</span>` : "";
  return `<div class="section-head"><h2 class="label" id="${id}">${esc(title)}${quiet}</h2></div>`;
}

// A big figure over the words that say what it counts: the record, the run.
function stat(figure, name) {
  return `<div class="stat"><dt class="stat__name">${esc(name)}</dt><dd class="stat__figure">${esc(figure)}</dd></div>`;
}

// One way of cutting the picks, in agate: a row for each part with how many picks it has, how
// many were right and wrong, and the share that were right in bold. A part with no picks has its
// row and no share, so the table is the same shape from the season's first week.
function split(id, title, of, rows) {
  const head = ["Picks", "Right", "Wrong", "Pct"]
    .map((name) => `<th scope="col" class="fig">${name}</th>`)
    .join("");
  const body = rows
    .map(
      (row) =>
        `<tr><td class="split__name">${esc(row.name)}</td><td class="dim">${row.right + row.wrong}</td><td>${row.right}</td><td>${row.wrong}</td><td class="strong">${share(row)}</td></tr>`,
    )
    .join("");
  return `
  <div class="split">
    <h3 class="split__title" id="${id}">${esc(title)}</h3>
    <div class="split__table">
      <table class="agate" aria-labelledby="${id}">
        <thead><tr><th scope="col">${of}</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  </div>`;
}

// The week's best or worst call: a red line saying which, and the call as a sentence that links
// to its game.
function callLine(name, call) {
  if (call == null) return "";
  return `<div class="call"><dt class="kicker">${esc(name)}</dt><dd class="call__sentence"><a href="#">${esc(callSentence(call))}</a></dd></div>`;
}

// The figures: the week's record, the run and the season's record as big figures; then the week
// by day and the season by how sure the pick was and by which team was picked; then the week's
// best and worst calls. Before any pick is decided (`?figures=0`), a sentence.
function figures(f) {
  const { week, run } = f;
  if (week == null || run == null) {
    return `
  <section class="figures" aria-labelledby="figures-h">
    ${sectionHead("figures-h", weekLabel({ current: true }))}
    <p class="empty">${esc(noFigures(f.awaiting))}</p>
  </section>`;
  }
  const streak = runWords(run);
  const calls =
    week.best || week.worst
      ? `<dl class="calls">${callLine(BEST_CALL, week.best)}${callLine(WORST_CALL, week.worst)}</dl>`
      : "";
  return `
  <section class="figures" aria-labelledby="figures-h">
    ${sectionHead("figures-h", weekLabel(week), weekSpan(week))}
    <dl class="stats">
      ${stat(record(week.tally), week.current ? "This week" : "That week")}
      ${stat(streak.figure, streak.key)}
      ${stat(record(f.season), "This season")}
    </dl>
    <div class="splits">
      ${split(
        "split-day",
        "By day",
        "Day",
        week.days.map((day) => ({ ...day, name: slateDay(day.date) })),
      )}
      ${split(
        "split-sure",
        "By how sure, this season",
        "Chance",
        f.bands.map((band) => ({ ...band, name: bandLabel(band) })),
      )}
      ${split("split-side", "By side, this season", "Pick", [
        { ...f.sides.home, name: SIDE_LABELS.home },
        { ...f.sides.road, name: SIDE_LABELS.road },
      ])}
    </div>
    ${calls}
  </section>`;
}

// The figures the address asks for: the sample picks', none at all, or a mid-season's big three.
function picksFigures() {
  if (params.get("figures") === "0") {
    return { ...PICKS, season: { right: 0, wrong: 0 }, run: null, week: null };
  }
  if (params.get("season") === "mid") {
    return {
      ...PICKS,
      season: PICKS_MID.season,
      run: PICKS_MID.run,
      week: { ...PICKS.week, tally: PICKS_MID.week },
    };
  }
  return PICKS;
}

// `?page=picks`: the title and what a pick is, the figures, tonight's games each as a brief with
// its pick, and the columns in the pieces' grid.
function picksPage() {
  const games = slate.games;
  const count = games.length > 0 ? `${games.length} game${games.length === 1 ? "" : "s"}` : "";
  const columns =
    params.get("columns") === "0"
      ? []
      : COLUMN_KINDS.flatMap((kind) => COLUMNS.filter((column) => column.kind === kind));
  return `
    <main id="content" class="picks">
      <div>
        <header class="page-head"><h1 class="band-title">${esc(PICKS_TITLE)}</h1></header>
        <p class="deck picks__lede">${esc(PICKS_LEDE)}</p>
      </div>
      ${figures(picksFigures())}
      <section class="picks-tonight" aria-labelledby="tonight-h">
        ${sectionHead("tonight-h", TONIGHT_LABEL, count)}
        <ul class="brief-list">${briefRows(games)}</ul>
      </section>
      ${pieces(columns, COLUMNS_LABEL, "columns-h")}
    </main>`;
}

function switcher() {
  if (params.get("chrome") === "0") return "";
  const link = (key, text) => {
    const p = new URLSearchParams(location.search);
    p.set("slate", key);
    return `<a href="?${p}" aria-current="${slateKey === key}">${text}</a>`;
  };
  return `<div class="proto" aria-label="Prototype switcher">Slate ${link("tonight", "Oct 11 · 3 finals")}${link("busy", "Busy · live + upcoming")}</div>`;
}

function render() {
  const { leads, briefs: rest } = leadsAndBriefs(slate.games);
  const home = () => `
    <main id="content">
      <section class="roundup" aria-labelledby="roundup-h">
        <h2 class="label" id="roundup-h">NHL Roundup</h2>
        <div class="stories">${leads.map(story).join("")}</div>
      </section>
      ${briefs(rest)}
      ${pieces(PIECES.slice(0, Number(params.get("pieces") ?? PIECES.length)))}
      ${news(params.get("news") === "0" ? [] : NEWS)}
      ${lower()}
    </main>`;
  document.getElementById("app").innerHTML = `
  <div class="page">
    ${masthead()}${onPicks ? picksPage() : home()}
    <footer class="footer"><p>Scores and stats from <a href="#">ESPN</a>. Yogan Hockey is a family project, not affiliated with ESPN or the NHL.</p></footer>
  </div>
  ${switcher()}`;
}

document.addEventListener("click", (event) => {
  const theme = event.target.closest("[data-theme]");
  if (theme) {
    const dark = theme.dataset.theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
    document.querySelector('meta[name="theme-color"]').content = dark ? "#121212" : "#fafaf8";
    render();
    // The one drawn: the desk's and the phone's are both written.
    [...document.querySelectorAll(`.theme [data-theme="${dark ? "light" : "dark"}"]`)]
      .find((button) => button.offsetParent != null)
      ?.focus();
    return;
  }
  const conf = event.target.closest(".conf-tabs [data-conf]");
  if (conf) {
    state.conf = conf.dataset.conf;
    render();
    document.querySelector(`.conf-tabs [data-conf="${state.conf}"]`)?.focus();
  }
});

render();
