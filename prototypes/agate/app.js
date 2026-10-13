// PROTOTYPE (Agate). Draws Home from data.js with the sentences of copy.js.
// Address options: ?slate=tonight|busy  &theme=light|dark  &chrome=0 (hide the switcher)
// &picks=1 (the sections with Picks among them)  &news=0 (a day ESPN's news could not be read)
// &pieces=0 (a day with no written piece)  &pieces=1|2 (only so many of them)

import {
  agateName,
  briefGame,
  counts,
  deck,
  headline,
  kicker,
  leadsAndBriefs,
  PIECES_LABEL,
  pickOutcome,
  pickSentence,
  pieceKicker,
  spelled,
  tonightPicks,
  unbroken,
  WRITTEN_BY,
} from "./copy.js";
import { NEWS, PIECES, SLATES, STANDINGS } from "./data.js";

const params = new URLSearchParams(location.search);
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

// The theme's two buttons. They are written twice and drawn once: at the end of the sections' row
// at a desk, and at the end of the dateline on a phone, where the row has no room for them.
function themeControl(place, dark) {
  return `<div class="theme theme--${place}" role="group" aria-label="Theme">
        <button type="button" data-theme="light" aria-pressed="${!dark}">${SUN}<span class="theme__word">Day</span></button>
        <button type="button" data-theme="dark" aria-pressed="${dark}">${MOON}<span class="theme__word">Night</span></button>
      </div>`;
}

// The nameplate first, as a newspaper's; then the sections between the double rule and a plain
// one, in a row that stays at the top of the screen; then the dateline. `?picks=1` adds the
// section the Picks page (#218) will bring, to show the row has room for it.
function masthead() {
  const c = counts(slate.games);
  const dark = document.documentElement.classList.contains("dark");
  const places = ["Home", "Scores", "Standings", "Teams", "Players"];
  if (params.get("picks") === "1") places.push("Picks");
  const nav = places
    .map((n, i) => `<a href="#"${i === 0 ? ' aria-current="page"' : ""}>${n}</a>`)
    .join("");
  return `
  <header class="masthead">
    <h1 class="wordmark"><a href="#">Yogan Hockey</a></h1>
    <p class="masthead__date">${esc(slate.date)}</p>
  </header>
  <div class="section-row">
    <div class="section-row__inner">
      <nav class="sections" aria-label="Main">${nav}</nav>
      ${themeControl("desk", dark)}
    </div>
  </div>
  <div class="dateline">
    <p class="dateline__inner">
      <span class="dateline__wide">${esc(slate.date)}</span>
      <span class="dateline__wide">Tonight: ${c.total} games${c.live ? ` · ${c.live} live` : ""}${c.toCome ? ` · ${c.toCome} to come` : ""}${c.final ? ` · ${c.final} final` : ""}</span>
      <span class="dateline__wide">Picks this season: ${slate.record.right} right, ${slate.record.wrong} wrong</span>
      <span class="dateline__narrow">${c.total} games${c.live ? ` · ${c.live} live` : ""}${c.final ? ` · ${c.final} final` : ""} · Picks ${slate.record.right}–${slate.record.wrong}</span>
    </p>
    ${themeControl("phone", dark)}
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

function briefs(list) {
  if (list.length === 0) return "";
  const rows = list
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
  return `
  <section class="briefs" aria-labelledby="briefs-h">
    <h2 class="label" id="briefs-h">Around the league</h2>
    <ul class="brief-list">${rows}</ul>
  </section>`;
}

// The written pieces (#217), in the leads' grid: what each is and its day, its headline (a link
// to its own page), its first paragraph cut at five lines, and that a model wrote it and when.
// With none (`?pieces=0`) the section is not drawn at all.
function pieces(list) {
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
  <section class="pieces" aria-labelledby="pieces-h">
    <h2 class="label" id="pieces-h">${esc(PIECES_LABEL)}</h2>
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
  document.getElementById("app").innerHTML = `
  <div class="page">
    ${masthead()}
    <main id="content">
      <section class="roundup" aria-labelledby="roundup-h">
        <h2 class="label" id="roundup-h">NHL Roundup</h2>
        <div class="stories">${leads.map(story).join("")}</div>
      </section>
      ${briefs(rest)}
      ${pieces(PIECES.slice(0, Number(params.get("pieces") ?? PIECES.length)))}
      ${news(params.get("news") === "0" ? [] : NEWS)}
      ${lower()}
    </main>
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
