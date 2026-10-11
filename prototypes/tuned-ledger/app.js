// PROTOTYPE (#128): the tuned ledger, the typeface choices and the goal sequence.
// Throwaway code. Three screens drawn from recorded fixtures (data.js) by template strings, with
// every choice held in the URL so a link reproduces exactly what is on screen:
//   ?font=geist|jetbrains|plex  &weights=regular|medium|heavy  &theme=light|dark
//   &colors=tuned|today  &motion=reduce|full  &chrome=0  &play=goal|goal-home|shot|save   #/home|game|standings
import { DARK_MARKS, DIVISIONS, GAME, PLAYS, SLATE, TEAMS } from "./data.js";
import { animate, describe, markKind, rinkSvg } from "./rink.js";
import { PALETTES } from "./tokens.js";

const FONTS = {
  geist: { name: "Geist Mono", note: "today's typeface" },
  jetbrains: { name: "JetBrains Mono", note: "taller letters, wider bold" },
  plex: { name: "IBM Plex Mono", note: "slab serifs, a typewriter ledger" },
};
/* quiet (asides), body, label (column headers, tabs), strong (titles, winners), score. */
const WEIGHTS = {
  regular: { name: "Regular", note: "400 / 700, as today", set: [400, 400, 400, 700, 700] },
  medium: { name: "Medium", note: "500 body, 700 bold", set: [400, 500, 500, 700, 700] },
  heavy: { name: "Heavy", note: "500 body, 800 scores", set: [400, 500, 600, 800, 800] },
};
const SCREENS = ["home", "game", "standings", "teams", "players"];
const NAV = [
  { label: "Home", screen: "home" },
  { label: "Scores", screen: "game" },
  { label: "Standings", screen: "standings" },
  { label: "Teams", screen: "teams" },
  { label: "Players", screen: "players" },
];
const FAVORITE_TEAM = "21";

const systemDark = matchMedia("(prefers-color-scheme: dark)");
const systemReduced = matchMedia("(prefers-reduced-motion: reduce)");

function readState() {
  const query = new URLSearchParams(location.search);
  const pick = (key, options, fallback) =>
    options.includes(query.get(key)) ? query.get(key) : fallback;
  const screen = location.hash.replace(/^#\/?/, "");
  return {
    screen: SCREENS.includes(screen) ? screen : "home",
    font: pick("font", Object.keys(FONTS), "geist"),
    weights: pick("weights", Object.keys(WEIGHTS), "medium"),
    theme: pick("theme", ["light", "dark"], systemDark.matches ? "dark" : "light"),
    colors: pick("colors", ["tuned", "today"], "tuned"),
    // `full` plays the animations on a device that asks for reduced motion, for the review.
    reduced:
      query.get("motion") === "reduce" || (query.get("motion") !== "full" && systemReduced.matches),
    chrome: query.get("chrome") !== "0",
  };
}

let state = readState();
/** Not in the URL: the play in focus on the game screen, and whether the options are open. */
let focusId = null;
let sheet = false;
let mini = false;
/** True only while `replay` draws: a goal is then drawn with both scores, ready to roll. */
let rolling = false;
/** The play whose animation is on the rink, so a change of typeface or theme can redraw it. */
let played = null;

function set(changes) {
  const query = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value == null) query.delete(key);
    else query.set(key, value);
  }
  query.delete("play");
  history.replaceState(null, "", `?${query}${location.hash}`);
  state = readState();
  // The end of the animation on show survives the redraw, with nothing replayed.
  if (played && state.screen === "game") replay(played, true);
  else render();
}

const html = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const mark = (teamId) => {
  const dark = state.theme === "dark" && DARK_MARKS.includes(teamId) ? "-dark" : "";
  return `<img class="mark" src="assets/team-marks/${teamId}${dark}.webp" alt="" width="42" height="42">`;
};
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/* ---------- The shell ---------- */

function shell(page) {
  const current = (screen) => (screen === state.screen ? ' aria-current="page"' : "");
  const links = (className) =>
    NAV.map(
      (item) =>
        `<a class="${className}" href="#/${item.screen}"${current(item.screen)}>${item.label}</a>`,
    ).join("");
  const toggle = `<button class="theme-toggle" data-set="theme" data-value="${state.theme === "dark" ? "light" : "dark"}">${state.theme === "dark" ? "light mode" : "dark mode"}</button>`;
  return `
    <div class="shell">
      <aside class="sidebar">
        <a class="wordmark" href="#/home">YOGAN/HOCKEY</a>
        <nav aria-label="Site">${links("nav-item")}</nav>
        ${toggle}
      </aside>
      <div class="column">
        <header class="topbar"><a class="wordmark" href="#/home">YOGAN/HOCKEY</a>${toggle}</header>
        ${strip()}
        <main>${page}</main>
        <footer class="footer">Scores and stats from <a href="https://www.espn.com/nhl/">ESPN</a>. Yogan Hockey is a family project, not affiliated with ESPN or the NHL.</footer>
      </div>
      <nav class="tabbar" aria-label="Site">${links("")}</nav>
    </div>`;
}

const statusText = (game) => game.line ?? time.format(new Date(game.startTime));

function strip() {
  const side = (team) =>
    `<span class="side${team.won ? " won" : ""}"><span>${mark(team.id)}${team.abbreviation}</span>${team.score == null ? "" : ` <span>${team.score}</span>`}</span>`;
  const games = SLATE.map(
    (game) => `
      <a class="strip-game${game.status === "live" ? " live" : ""}" href="#/game">
        ${side(game.away)}<span class="at">@</span>${side(game.home)}
        <span class="when">${statusText(game)}</span>
      </a>`,
  ).join("");
  return `
    <div class="strip" aria-label="Scores">
      <span class="strip-label">SCORES</span>
      <div class="strip-games">${games}</div>
      <button class="strip-more" aria-label="All ${SLATE.length} games">+${SLATE.length - 3}<span class="caret" aria-hidden="true"></span></button>
    </div>`;
}

/* ---------- Home ---------- */

function sectionHeader(title, count, aside = "") {
  return `
    <div class="section-header">
      <h2>${title}${count ? ` <span class="count">${count}</span>` : ""}</h2>
      ${aside ? `<div class="aside">${aside}</div>` : ""}
    </div>`;
}

function gamesLedger() {
  const team = (side, lost) => `
    <td>${mark(side.id)}<span class="${side.won ? "strong" : ""}">${side.abbreviation}</span>${
      side.id === FAVORITE_TEAM ? ' <span class="fav" title="favorite team">★</span>' : ""
    }<span class="record aside-text">${side.record ?? ""}</span></td>
    <td class="score${lost ? " lost" : ""}">${side.score ?? ""}</td>`;
  const rows = SLATE.map((game) => {
    const final = game.status === "final";
    const status =
      game.status === "live"
        ? `<span class="live-marker status"><span>${game.line}</span></span>`
        : statusText(game);
    const favorite = [game.away.id, game.home.id].includes(FAVORITE_TEAM);
    const pick = game.pick ?? "No pick";
    return `
      <tr class="interactive${game.status === "live" ? " live" : ""}">
        <td><a class="row-link" href="#/game"><span class="sr-only">${game.away.abbreviation} at ${game.home.abbreviation}, </span>${status}</a><span class="detail narrow-only">${pick}</span></td>
        ${team(game.away, final && !game.away.won)}${team(game.home, final && !game.home.won)}
        <td class="note">${favorite ? '<span class="pick">★ favorite team</span>' : ""}<span class="pick">${pick}</span><span class="where">${html(game.where)}</span></td>
      </tr>`;
  }).join("");
  return `
    <div class="ledger-box"><table class="ledger games">
      <thead><tr>
        <th class="c-status">status</th><th class="c-team">away</th><td class="c-score"></td>
        <th class="c-team">home</th><td class="c-score"></td><th class="c-note">note</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`;
}

function conferenceTop(conference) {
  const rows = DIVISIONS.filter((division) => division.conference === conference)
    .flatMap((division) => division.rows)
    .sort((a, b) => b.pts - a.pts || a.gp - b.gp || b.diff - a.diff)
    .slice(0, 8);
  const name = conference === "East" ? "eastern conference" : "western conference";
  const count = `<span class="desk-only">${name}</span><span class="phone-only">${conference.toLowerCase()}</span>`;
  return `
    <section aria-label="Standings, ${name}">
      ${sectionHeader("Standings", count, '<a href="#/standings">full standings</a>')}
      <div class="ledger-box"><table class="ledger">
        <thead><tr><th>#</th><th style="width:40%">team</th><th class="num">w</th><th class="num">l</th><th class="num">otl</th><th class="num">pts</th></tr></thead>
        <tbody>${rows
          .map(
            (row, index) => `
          <tr class="interactive">
            <td class="rank">${index + 1}</td>
            <td><a class="row-link" href="#/teams">${mark(row.id)}${row.abbreviation}</a></td>
            <td class="num">${row.w}</td><td class="num">${row.l}</td><td class="num">${row.otl}</td>
            <td class="num strong">${row.pts}</td>
          </tr>`,
          )
          .join("")}</tbody>
      </table></div>
    </section>`;
}

function home() {
  const live = SLATE.filter((game) => game.status === "live").length;
  const season = "3 GP · 1 G · 0 A · 1 PTS";
  return `
    <section aria-label="Tonight">
      ${sectionHeader("Tonight", `${SLATE.length} games, ${live} live`, '<span>picks: 3 right, 2 wrong</span><a href="#/game">all scores</a>')}
      ${gamesLedger()}
    </section>
    <section aria-label="Favorites" class="half">
      ${sectionHeader("Favorites", "", '<a href="#/players">all players</a>')}
      <div class="ledger-box"><table class="ledger favorites">
        <thead><tr><th>player</th><th>team</th><th class="desk-only">season</th><td></td></tr></thead>
        <tbody><tr class="interactive">
          <td><a class="row-link strong" href="#/players">Auston Matthews</a><span class="detail phone-only">${season}</span></td>
          <td>${mark("21")}TOR <span class="aside-text">C</span></td>
          <td class="desk-only note">${season}</td>
          <td class="num"><button class="heart" aria-label="Remove Auston Matthews from favorites" aria-pressed="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.2 2.3 8.6a3.6 3.6 0 0 1 5.1-5.1l.6.6.6-.6a3.6 3.6 0 0 1 5.1 5.1z"/></svg></button></td>
        </tr></tbody>
      </table></div>
    </section>
    <div class="two-up">${conferenceTop("East")}${conferenceTop("West")}</div>`;
}

/* ---------- Standings ---------- */

function standings() {
  const tabs = (items, label) =>
    `<nav class="tabs" aria-label="${label}">${items
      .map(
        ([text, href], index) =>
          `<a href="${href}"${index === 0 ? ' aria-current="page"' : ""}>${text}</a>`,
      )
      .join("")}</nav>`;
  const table = (division) => `
    <section aria-label="${division.title}">
      ${sectionHeader(division.title, division.conference, "<span>playoff line: top 3</span>")}
      <div class="ledger-box"><table class="ledger">
        <thead><tr><th>#</th><th style="width:100%">team</th><th class="num">gp</th><th class="num">w</th><th class="num">l</th><th class="num">otl</th><th class="num">diff</th><th class="num">pts</th></tr></thead>
        <tbody>${division.rows
          .map((row, index) => {
            const tone = row.diff > 0 ? "positive" : row.diff < 0 ? "negative" : "";
            return `
          <tr class="interactive${index === 2 ? " cutoff" : ""}">
            <td class="rank">${index + 1}</td>
            <td><a class="row-link" href="#/teams">${mark(row.id)}<span class="desk-only">${html(row.name)}</span><span class="phone-only">${row.abbreviation}</span></a></td>
            <td class="num">${row.gp}</td><td class="num">${row.w}</td><td class="num">${row.l}</td><td class="num">${row.otl}</td>
            <td class="num ${tone}">${row.diff > 0 ? "+" : ""}${row.diff}</td>
            <td class="num strong">${row.pts}</td>
          </tr>`;
          })
          .join("")}</tbody>
      </table></div>
    </section>`;
  const column = (conference) =>
    `<div class="stack">${DIVISIONS.filter((d) => d.conference === conference)
      .map(table)
      .join("")}</div>`;
  return `
    <div>
      <div class="page-head"><h1>NHL</h1>${tabs(
        [
          ["standings", "#/standings"],
          ["teams", "#/teams"],
        ],
        "NHL",
      )}</div>
      ${tabs(
        ["division", "conference", "wild card", "league"].map((view) => [view, "#/standings"]),
        "Standings view",
      )}
    </div>
    <div class="two-up">${column("East")}${column("West")}</div>`;
}

/* ---------- The live game ---------- */

/*
 * The recorded game is a final. The prototype stops it at Esa Lindell's goal, 4:24 into the 2nd,
 * as a Game Stream would have it at that moment.
 */
const find = (text) => PLAYS.find((play) => play.text.startsWith(text));
const LIVE = find("Esa Lindell Goal");
const SO_FAR = PLAYS.slice(0, PLAYS.indexOf(LIVE) + 1);
const KEY_SO_FAR = SO_FAR.filter((play) => play.key);
const REPLAYS = {
  goal: { label: `Goal · ${GAME.away.abbreviation}`, play: LIVE },
  "goal-home": { label: `Goal · ${GAME.home.abbreviation}`, play: find("Josh Norris Goal (13)") },
  shot: { label: "Shot, wide", play: find("Jack Quinn Wrist Shot Wide Left") },
  save: { label: "Save", play: find("Jason Robertson Wrist Shot saved") },
};
const playTime = (play) => `${play.periodText} ${play.clock}`;
const abbreviation = (teamId) => (teamId ? (TEAMS[teamId]?.abbreviation ?? "") : "");
const shots = (teamId) =>
  SO_FAR.filter(
    (play) => play.teamId === teamId && (play.type === "shot-on-goal" || play.type === "goal"),
  ).length;

/** The end a team shoots at in a period, read from where its shots fell (as `attackedEnd` does). */
function attackedEnd(teamId, period) {
  const lean = PLAYS.filter(
    (play) => play.period === period && play.teamId === teamId && play.coordinate && describe(play),
  ).reduce((sum, play) => sum + Math.sign(play.coordinate.x), 0);
  return lean === 0 ? null : lean > 0 ? "right" : "left";
}

const channels = (hex) => [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
function luminance(hex) {
  const [r, g, b] = channels(hex).map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/**
 * A team's colour as the tint over the ice. Navy on slate would not show, so in the dark theme a
 * colour too dark to see is lifted towards white until it stands off the page.
 */
function tintColour(hex) {
  if (state.theme !== "dark") return hex;
  let colour = hex;
  for (let step = 0; step < 8 && luminance(colour) < 0.2; step++) {
    colour = `#${channels(colour)
      .map((value) =>
        Math.round(value + (255 - value) * 0.18)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
  }
  return colour;
}

function caption(play) {
  const kind = markKind(play);
  const when = `<span class="time">${playTime(play)}</span>`;
  if (kind !== "goal") {
    return `<span class="flag"></span><span class="words"><span class="how">${html(play.text)} ${when}</span></span>`;
  }
  const colour = TEAMS[play.teamId].color;
  const number = /Goal \((\d+)\)/.exec(play.text)?.[1];
  const rest = play.text.replace(/^.*?Goal(?: \(\d+\))? /, "");
  const strength = { "power-play": " · power play", "short-handed": " · short-handed" };
  return `
    <span class="flag" style="--flag:${colour};--flag-fg:${luminance(colour) > 0.4 ? "#000" : "#fff"}">GOAL</span>
    <span class="words">
      <span class="who">${abbreviation(play.teamId)} · ${html(play.scorer)}${number ? ` (${number})` : ""} ${when}</span>
      <span class="how">${html(rest)}${strength[play.strength] ?? ""}</span>
    </span>`;
}

function timeline() {
  const minutes = (clock) => {
    const [m, s] = clock.split(":").map(Number);
    return m + s / 60;
  };
  const at = (play) => (minutes(play.clock) / 20) * 100;
  return `
    <div class="timeline" aria-label="The game so far, by period">
      ${["1st", "2nd", "3rd"]
        .map((label, index) => {
          const period = index + 1;
          const ticks = KEY_SO_FAR.filter((play) => play.period === period && play.coordinate)
            .map(
              (play) =>
                `<i class="tick k-${markKind(play)}" style="left:${at(play).toFixed(2)}%"></i>`,
            )
            .join("");
          const unplayed = period < LIVE.period ? 100 : period === LIVE.period ? at(LIVE) : 0;
          return `<div class="period">${label}${ticks}${
            unplayed < 100 ? `<i class="unplayed" style="left:${unplayed.toFixed(2)}%"></i>` : ""
          }${period === LIVE.period ? `<i class="now" style="left:${at(LIVE).toFixed(2)}%"></i>` : ""}</div>`;
        })
        .join("")}
    </div>`;
}

function game() {
  const focus = PLAYS.find((play) => play.id === focusId) ?? LIVE;
  const scoredSide = focus.scoring ? (focus.teamId === GAME.home.id ? "home" : "away") : null;
  const side = (place) => {
    const team = GAME[place];
    const score = focus[`${place}Score`];
    // A goal is drawn with the score before it above the score after it, for the roll.
    const rolls = rolling && scoredSide === place;
    const digits = rolls
      ? `<span>${score - 1}</span><span>${score}</span>`
      : `<span>${score}</span>`;
    return `
      <div class="over-side ${place}${rolls ? " scored" : ""}">
        <div class="over-line">${mark(team.id)}${team.abbreviation}<span class="wide"> · ${shots(team.id)} shots</span></div>
        <div class="figure" aria-label="${score}"><span class="roll">${digits}</span></div>
        <div class="over-sog">${shots(team.id)} sog</div>
      </div>`;
  };
  const endLabel = (end) => {
    const team = [GAME.away, GAME.home].find((t) => attackedEnd(t.id, focus.period) === end);
    return team
      ? `<div class="over-end ${end}">${team.abbreviation} shoots this way · ${focus.periodText}</div>`
      : "";
  };
  const live = focus === LIVE;
  const kicker =
    markKind(focus) === "goal" && played === focus
      ? '<span class="kicker goal">Goal</span>'
      : live
        ? '<span class="kicker"><span class="live-marker">live</span></span>'
        : '<span class="kicker replayed">replay</span>';
  const controls = state.chrome
    ? `
    <div class="proto-controls">
      <span class="legend">Prototype controls · replay an animation (or tap any play below)</span>
      ${Object.entries(REPLAYS)
        .map(([key, replay]) => `<button data-replay="${key}">${replay.label}</button>`)
        .join("")}
      <span class="gap"></span>
      <button data-set="motion" data-value="${state.reduced ? "full" : "reduce"}" aria-pressed="${state.reduced}">Reduced motion: ${state.reduced ? "on" : "off"}</button>
    </div>`
    : "";
  const rows = [...KEY_SO_FAR]
    .reverse()
    .map((play) => {
      const kind = markKind(play);
      return `
      <button class="play${kind === "goal" ? " goal" : ""}${play.teamId ? "" : " quiet"}" data-play-id="${play.id}" aria-pressed="${play.id === focus.id}">
        <span class="t">${playTime(play)}</span><span>${abbreviation(play.teamId)}</span><span class="x">${html(play.text)}</span>
      </button>`;
    })
    .join("");
  return `
    <section aria-label="${GAME.away.abbreviation} at ${GAME.home.abbreviation}">
      <div class="rink-wrap">
        <div class="rink-ice">
          ${rinkSvg(KEY_SO_FAR, focus)}
          <div class="over">
            ${side("away")}
            <div class="over-status">${kicker}${playTime(focus)}</div>
            ${side("home")}
            ${endLabel("left")}${endLabel("right")}
          </div>
        </div>
        <p class="caption">${caption(focus)}</p>
      </div>
      ${timeline()}
      ${controls}
    </section>
    <section aria-label="Plays">
      <div class="page-head">
        <nav class="tabs" aria-label="Game"><a href="#/game" aria-current="page">plays</a><a href="#/game">scoring</a><a href="#/game">the pick</a></nav>
        <nav class="tabs" aria-label="Plays shown"><a href="#/game" aria-current="page">key plays <span class="n">${KEY_SO_FAR.length}</span></a><a href="#/game">every play <span class="n">${SO_FAR.length}</span></a></nav>
      </div>
      <div class="plays">${rows}</div>
    </section>`;
}

function replay(play, instant = false) {
  focusId = play.id;
  played = null;
  const description = describe(play);
  rolling = description != null;
  if (rolling) played = play;
  render();
  rolling = false;
  if (description == null) return;
  animate(document.querySelector(".rink-wrap"), description, {
    reduced: instant || state.reduced,
    tint: tintColour(TEAMS[play.teamId].color),
  });
}

/* ---------- The switcher ---------- */

const COMBOS = Object.keys(FONTS).flatMap((font) =>
  Object.keys(WEIGHTS).map((weights) => ({ font, weights })),
);
function cycle(step) {
  const at = COMBOS.findIndex((c) => c.font === state.font && c.weights === state.weights);
  set(COMBOS[(at + step + COMBOS.length) % COMBOS.length]);
}

function switcher() {
  const host = document.getElementById("switcher");
  host.hidden = !state.chrome;
  host.classList.toggle("mini", mini);
  if (mini) {
    host.innerHTML =
      '<button class="sw-mini" data-sw="mini" aria-label="Show the prototype switcher">Aa</button>';
    return;
  }
  const at = COMBOS.findIndex((c) => c.font === state.font && c.weights === state.weights);
  const group = (title, key, options, current) => `
    <h3>${title}</h3>
    <div class="sw-row">${options
      .map(
        ([value, label]) =>
          `<button data-set="${key}" data-value="${value}" aria-pressed="${value === current}">${label}</button>`,
      )
      .join("")}</div>`;
  const options = sheet
    ? `<div class="sw-sheet">
        ${group(
          "Typeface",
          "font",
          Object.entries(FONTS).map(([key, font]) => [key, font.name]),
          state.font,
        )}
        ${group(
          "Weights",
          "weights",
          Object.entries(WEIGHTS).map(([key, weight]) => [key, weight.name]),
          state.weights,
        )}
        ${group(
          "Theme",
          "theme",
          [
            ["light", "Paper"],
            ["dark", "Slate"],
          ],
          state.theme,
        )}
        ${group(
          "Colours",
          "colors",
          [
            ["tuned", "Tuned"],
            ["today", "Today's"],
          ],
          state.colors,
        )}
        ${group(
          "Motion",
          "motion",
          [
            ["", "As the device"],
            ["reduce", "Reduced"],
            ["full", "Full"],
          ],
          new URLSearchParams(location.search).get("motion") ?? "",
        )}
        <h3>This bar</h3>
        <div class="sw-row"><button data-sw="mini">Tuck it away</button></div>
      </div>`
    : "";
  host.innerHTML = `
    ${options}
    <div class="sw-bar" role="group" aria-label="Prototype: typeface and weights">
      <button class="sw-arrow" data-sw="prev" aria-label="Previous typeface and weights">‹</button>
      <button class="sw-label" data-sw="sheet" aria-expanded="${sheet}">
        ${FONTS[state.font].name} · ${WEIGHTS[state.weights].name}
        <small>${at + 1} of ${COMBOS.length} · ${sheet ? "close options" : "tap for options"}</small>
      </button>
      <button class="sw-arrow" data-sw="next" aria-label="Next typeface and weights">›</button>
    </div>`;
}

/* ---------- Drawing and events ---------- */

function render() {
  const root = document.documentElement;
  root.dataset.theme = state.theme;
  for (const [name, value] of Object.entries(PALETTES[state.colors][state.theme])) {
    root.style.setProperty(`--${name}`, value);
  }
  root.style.setProperty("--font", `"${FONTS[state.font].name}"`);
  ["quiet", "body", "label", "strong", "score"].forEach((name, index) => {
    root.style.setProperty(`--w-${name}`, WEIGHTS[state.weights].set[index]);
  });
  const pages = {
    home,
    game,
    standings,
    teams: () => placeholder("Teams"),
    players: () => placeholder("Players"),
  };
  document.getElementById("app").innerHTML = shell(pages[state.screen]());
  switcher();
}

function placeholder(title) {
  return `
    <section>
      ${sectionHeader(title, "")}
      <p class="placeholder">Not drawn in this prototype. ${title} keeps its ledgers as they are today and takes the same type, colours, spacing and tab bar as Home and Standings.</p>
    </section>`;
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-set],[data-replay],[data-play-id],[data-sw]");
  if (target == null) return;
  if (target.dataset.set) set({ [target.dataset.set]: target.dataset.value || null });
  else if (target.dataset.replay) replay(REPLAYS[target.dataset.replay].play);
  else if (target.dataset.playId) replay(PLAYS.find((play) => play.id === target.dataset.playId));
  else if (target.dataset.sw === "prev") cycle(-1);
  else if (target.dataset.sw === "next") cycle(1);
  else {
    if (target.dataset.sw === "sheet") sheet = !sheet;
    else {
      mini = !mini;
      sheet = false;
    }
    switcher();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.target.closest("input,textarea,[contenteditable]")) return;
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "ArrowLeft") cycle(-1);
  if (event.key === "ArrowRight") cycle(1);
});
addEventListener("hashchange", () => {
  state = readState();
  focusId = null;
  played = null;
  render();
  scrollTo(0, 0);
});
systemDark.addEventListener("change", () => set({}));

render();
/* ?play=goal plays (or, with reduced motion, shows the end of) an animation on load. */
const autoplay = REPLAYS[new URLSearchParams(location.search).get("play")];
if (autoplay && state.screen === "game") document.fonts.ready.then(() => replay(autoplay.play));
