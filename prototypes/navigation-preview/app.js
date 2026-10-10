const { games, standings, marks, darkMarks = {} } = window.previewData;
const mark = (t) =>
  `<span class="team-mark"><img class="light-mark" src="${marks[t.id] || ""}" alt="" width="20" height="20">${darkMarks[t.id] ? `<img class="dark-mark" src="${darkMarks[t.id]}" alt="" width="20" height="20">` : ""}</span>`;
const time = (d) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Chicago",
  }).format(new Date(d));
const panelHeader = (title, detail = "", link = "", label = "") =>
  `<div class="panel-header"><h2>${title}${detail ? `<span>${detail}</span>` : ""}</h2>${link ? `<a class="panel-link" href="${link}">${label} ↗</a>` : ""}</div>`;
// These are the repository's seeded preview picks (lib/sample-picks.ts), not fresh predictions.
const samplePick = (g) => {
  const index = games.indexOf(g);
  return g.id === "401892450"
    ? null
    : {
        team: g.home,
        probability: g.id === "401892449" ? 58 : 52 + ((index * 3) % 14),
      };
};
const pickCell = (g) => {
  const pick = samplePick(g);
  return pick
    ? `<span class="ai-pick">${pick.team.abbreviation} <b>${pick.probability}%</b></span>`
    : '<span class="ai-pick unavailable" aria-label="AI pick unavailable">No pick</span>';
};
const gamePanel = (title = "Tonight") =>
  `<section class="panel">${panelHeader(title, "9 games", "#live", "All scores")}<div class="game-head"><span>Time</span><span>Away</span><span>Home</span><span>AI pick</span><span class="arena-label">Arena</span></div>${games.map((g) => `<a class="game game-row" href="#game/${g.id}" aria-label="${g.away.abbreviation} at ${g.home.abbreviation}, ${time(g.date)}"><time>${time(g.date)}</time><span class="team">${mark(g.away)}${g.away.abbreviation}</span><span class="team">${mark(g.home)}${g.home.abbreviation}</span>${pickCell(g)}<span class="arena" title="${g.venue}">${g.venue}</span></a>`).join("")}<p class="panel-note">AI picks are sample predictions, for fun. Open a game for the reasoning.</p></section>`;
const gameDetail = (g) => {
  const pick = samplePick(g);
  return `<div class="stack"><section class="panel">${panelHeader("Matchup", "Scheduled", "#live", "All scores")}<div class="matchup"><div>${mark(g.away)}<h2>${g.away.displayName}</h2><span>Away</span></div><span class="matchup-at">at</span><div>${mark(g.home)}<h2>${g.home.displayName}</h2><span>Home</span></div></div><p class="panel-note">Tuesday, October 6 · ${time(g.date)} · ${g.venue}</p></section><section class="panel">${panelHeader("AI pick", "Sample prediction")}<div class="pick-body">${pick ? `<p class="pick-lead">${pick.team.displayName} <strong>${pick.probability}%</strong></p><p class="pick-label">Chance of winning · picked team</p><p>They have the better record and the healthier lineup. Their starter has a .926 save percentage over his last five, and the other side played last night.</p><ul><li>A rested, healthy lineup</li><li>Goaltending form</li><li>Opponent on a back-to-back</li></ul>` : "<p>No AI pick is available for this game. The sample prediction failed.</p>"}</div><p class="panel-note">Seeded sample from the app’s fixture data · not a new model prediction.</p></section></div>`;
};
const conferencePanel = (c) =>
  `<section class="panel">${panelHeader(c.name.replace(" Conference", ""), "Top 8", "#standings", "Standings")}<div class="standing-wrap"><table class="standing-table"><thead><tr><th>#</th><th>Team</th><th class="extra">GP</th><th>W</th><th>L</th><th>OT</th><th class="extra">DIFF</th><th>PTS</th></tr></thead><tbody>${c.rows.map((r, i) => `<tr><td>${i + 1}</td><td><a class="standing-team" href="#teams" aria-label="${r.team.displayName}">${mark(r.team)}<span class="team-full">${r.team.displayName}</span><span class="team-short">${r.team.abbreviation}</span></a></td><td class="extra">${r.stats.gamesPlayed}</td><td>${r.stats.wins}</td><td>${r.stats.losses}</td><td>${r.stats.otLosses}</td><td class="extra">${r.stats.pointDifferential}</td><td>${r.stats.points}</td></tr>`).join("")}</tbody></table></div></section>`;
const playerPanel = (title = "Favorites") =>
  `<section class="panel">${panelHeader(title, "2 players", "#players", "All players")}<div class="players-list"><div class="player-row"><div><p class="player-name">Auston Matthews</p><p class="player-detail">Toronto Maple Leafs · Center</p></div><span class="player-status">#34</span></div><div class="player-row"><div><p class="player-name">Anthony Stolarz</p><p class="player-detail">Toronto Maple Leafs · Goalie</p></div><span class="player-status">#41</span></div></div><p class="panel-note">Sample favorites from the recorded player profiles.</p></section>`;
const teamPanel = () =>
  `<section class="panel">${panelHeader("Teams", "16 in this sample")}<div class="teams-grid">${standings
    .flatMap((c) => c.rows)
    .map(
      (r) =>
        `<div class="team-tile">${mark(r.team)}<div><p class="tile-name">${r.team.displayName}</p><p class="tile-detail">${r.team.abbreviation}</p></div></div>`,
    )
    .join("")}</div></section>`;
const views = {
  home: {
    title: "Overview",
    render: () =>
      `<div class="dashboard"><div class="stack">${gamePanel()}${playerPanel()}</div><div class="stack standings-stack">${standings.map(conferencePanel).join("")}</div></div>`,
  },
  scores: { title: "Scores", render: () => gamePanel("Tuesday, October 6") },
  standings: {
    title: "Standings",
    render: () =>
      `<div class="conference-grid">${standings.map(conferencePanel).join("")}</div>`,
  },
  teams: { title: "Teams", render: teamPanel },
  players: { title: "Players", render: () => playerPanel("Players") },
};
document.querySelector(".scoreboard").innerHTML = games
  .map(
    (g) =>
      `<a class="score-cell" href="#live" aria-label="${g.away.abbreviation} at ${g.home.abbreviation}, ${time(g.date)}"><span class="score-match">${g.away.abbreviation}<span class="score-at"> @ </span>${g.home.abbreviation}</span><time>${time(g.date)}</time></a>`,
  )
  .join("");
function render() {
  let route = location.hash.slice(1) || "home";
  if (route === "live") route = "scores";
  const game = route.startsWith("game/")
    ? games.find((g) => g.id === route.slice(5))
    : null;
  const view = game
    ? {
        title: `${game.away.abbreviation} at ${game.home.abbreviation}`,
        render: () => gameDetail(game),
      }
    : views[route] || views.home;
  const navRoute = game || route === "scores" ? "live" : route;
  document
    .querySelectorAll("nav a")
    .forEach((a) =>
      a.hash === `#${navRoute}`
        ? a.setAttribute("aria-current", "page")
        : a.removeAttribute("aria-current"),
    );
  document.querySelector("#content").innerHTML =
    `<div class="page-heading"><h1>${view.title}</h1><span class="page-meta">Oct 6, 2026 · Sample</span></div>${view.render()}`;
  document.title = `${view.title} · Yogan Hockey preview`;
  window.scrollTo({ top: 0, behavior: "instant" });
}
const theme = document.querySelector("#theme");
const themeLabel = () =>
  theme.setAttribute(
    "aria-label",
    `Switch to ${document.documentElement.dataset.theme === "dark" ? "light" : "dark"} mode`,
  );
themeLabel();
theme.addEventListener("click", () => {
  const next =
    document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  localStorage.setItem("preview-theme", next);
  themeLabel();
});
window.addEventListener("hashchange", render);
render();
