/* Isolated design prototype: all games, plays and probabilities are illustrative. */
const teams = {
  NSH: { id: 27, city: "Nashville", name: "Predators" },
  TOR: { id: 21, city: "Toronto", name: "Maple Leafs" },
  DAL: { id: 9, city: "Dallas", name: "Stars" },
  BUF: { id: 2, city: "Buffalo", name: "Sabres" },
  BOS: { id: 1, city: "Boston", name: "Bruins" },
  CHI: { id: 4, city: "Chicago", name: "Blackhawks" },
  NYR: { id: 13, city: "New York", name: "Rangers" },
  NJD: { id: 11, city: "New Jersey", name: "Devils" },
};
const games = [
  {
    id: "nsh-tor",
    away: "NSH",
    home: "TOR",
    a: 2,
    h: 3,
    status: "live",
    time: "P3 · 08:42",
    start: "6:00 PM",
    pick: "TOR",
    probability: 58,
    tv: "ESPN+ / TSN4",
  },
  {
    id: "bos-nyr",
    away: "BOS",
    home: "NYR",
    a: 1,
    h: 1,
    status: "live",
    time: "P2 · 12:06",
    start: "6:00 PM",
    pick: "NYR",
    probability: 55,
    tv: "ESPN+",
  },
  {
    id: "dal-buf",
    away: "DAL",
    home: "BUF",
    a: 4,
    h: 3,
    status: "final",
    time: "FINAL / SO",
    start: "6:30 PM",
    pick: "DAL",
    probability: 55,
    tv: "NHL NETWORK",
  },
  {
    id: "chi-njd",
    away: "CHI",
    home: "NJD",
    a: "–",
    h: "–",
    status: "upcoming",
    time: "8:30 PM CT",
    start: "8:30 PM",
    pick: null,
    probability: null,
    tv: "ESPN+",
  },
];
const events = [
  {
    time: "10:10",
    type: "faceoff",
    title: "Faceoff won",
    player: "Ryan O’Reilly",
    team: "NSH",
    detail: "Defensive-zone draw",
    x: 153,
    y: 248,
    shots: [23, 26],
    score: [2, 2],
    icon: "○",
  },
  {
    time: "09:51",
    type: "save",
    title: "Shot saved",
    player: "Filip Forsberg",
    team: "NSH",
    detail: "Wrist shot · 31 ft",
    x: 180,
    y: 130,
    net: 70,
    shots: [24, 26],
    score: [2, 2],
    icon: "◆",
  },
  {
    time: "09:33",
    type: "block",
    title: "Shot blocked",
    player: "William Nylander",
    team: "TOR",
    detail: "Slap shot · 44 ft",
    x: 534,
    y: 234,
    net: 603,
    shots: [24, 26],
    score: [2, 2],
    icon: "×",
  },
  {
    time: "09:10",
    type: "save",
    title: "Shot saved",
    player: "John Tavares",
    team: "TOR",
    detail: "Backhand · 15 ft",
    x: 642,
    y: 190,
    net: 690,
    shots: [24, 27],
    score: [2, 2],
    icon: "◆",
  },
  {
    time: "08:57",
    type: "miss",
    title: "Shot wide",
    player: "Mitch Marner",
    team: "TOR",
    detail: "Wrist shot · 29 ft",
    x: 590,
    y: 233,
    net: 690,
    shots: [24, 27],
    score: [2, 2],
    icon: "↗",
  },
  {
    time: "08:42",
    type: "goal",
    title: "Matthews puts Toronto ahead.",
    player: "Auston Matthews",
    team: "TOR",
    detail: "Wrist shot · 22 ft · Even strength",
    x: 620,
    y: 131,
    net: 690,
    shots: [24, 28],
    score: [2, 3],
    icon: "+",
  },
];
function saved(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Preview remains usable with storage disabled. */
  }
}
const favorites = new Set(saved("hockey-design-117-favorites", ["TOR", "NSH"]));
let theme = saved("hockey-design-117-theme", "dark");
let filter = "all";
let eventFilter = "all";
let selected = events.length - 1;
let tab = "plays";
let timer = null;
const main = document.querySelector("#main");
const announce = (message) => {
  document.querySelector("#announce").textContent = message;
};
const mark = (code, className = "") =>
  `<img class="${className}" src="assets/${teams[code].id}.webp" width="84" height="84" alt="">`;
const star = (code) =>
  `<button type="button" class="favorite" data-favorite="${code}" aria-label="Favorite ${teams[code].city} ${teams[code].name}" aria-pressed="${favorites.has(code)}">${favorites.has(code) ? "★" : "☆"}</button>`;
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  document.querySelector("#theme-label").textContent =
    theme === "dark" ? "LIGHTS ON" : "LIGHTS OUT";
  document
    .querySelector("#theme-toggle")
    .setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#101719" : "#f0f0e9";
}
function bench() {
  return `<aside class="bench"><div class="bench-heading"><span aria-hidden="true">✳</span><h2>Your bench.</h2></div><p class="bench-copy">YOUR TEAMS. ALWAYS WITHIN REACH.</p>${["TOR", "NSH"].map((code) => `<div class="bench-team">${mark(code)}<div><strong>${teams[code].name}</strong><small>${code === "TOR" ? "HOME ICE" : "ON THE ROAD"} · DEMO</small></div>${star(code)}</div>`).join("")}<a class="bench-end" href="#teams">Manage your teams <span class="arrow">↗</span></a></aside>`;
}
function feature() {
  return `<section class="feature"><div class="feature-top"><span class="live-label"><span class="live-dot"></span>LIVE GAME DEMO</span><span>3RD PERIOD · 08:42</span></div><div class="feature-kicker">HOME ICE / TOR</div><div class="feature-score"><div class="feature-team">${mark("NSH", "team-large")}<div><div class="abbr">NSH</div><div class="city">NASHVILLE</div></div></div><div class="feature-numbers"><strong>2</strong><span class="score-divider">/</span><strong>3</strong></div><div class="feature-team">${mark("TOR", "team-large")}<div><div class="abbr">TOR</div><div class="city">TORONTO</div></div></div></div><div class="feature-footer"><div class="pick"><span class="eyebrow">AI PICK<br>SAMPLE</span><strong>TOR 58%</strong></div><a class="cta" href="#game">ENTER THE GAME <span class="arrow" aria-hidden="true">↗</span></a></div></section>`;
}
function row(game) {
  const teamCell = (code, score) =>
    `<span class="row-team">${mark(code)}<span><span class="full-name">${teams[code].name}</span><span class="short-name">${code}</span>${favorites.has(code) ? '<span class="fav-star" aria-label="Favorite">★</span>' : ""}</span><span class="team-score">${score}</span></span>`;
  return `<a class="game-row" href="#${game.id === "nsh-tor" ? "game" : `match/${game.id}`}" aria-label="${teams[game.away].city} ${game.a}, ${teams[game.home].city} ${game.h}, ${game.time}, sample game"><span class="row-status ${game.status === "live" ? "row-live" : ""}">${game.status === "live" ? "■ LIVE DEMO" : game.status === "final" ? "FINAL" : "TONIGHT"}<small>${game.time}</small></span>${teamCell(game.away, game.a)}${teamCell(game.home, game.h)}<span class="row-pick">${game.pick ? `${game.pick} <strong>${game.probability}%</strong><span class="meter"><span style="width:${game.probability}%"></span></span>` : '<span class="muted">No pick</span>'}</span><span class="row-tv">${game.tv}</span><span class="row-arrow" aria-hidden="true">↗</span></a>`;
}
function slate() {
  const visible = games.filter(
    (game) =>
      filter === "all" ||
      (filter === "live"
        ? game.status === "live"
        : favorites.has(game.away) || favorites.has(game.home)),
  );
  return `<div class="slate-head" aria-hidden="true"><span class="status-label">GAME STATE</span><span class="away-label">AWAY</span><span class="home-label">HOME</span><span>AI / SAMPLE</span><span class="tv-label">BROADCAST</span><span></span></div>${visible.map(row).join("") || '<p class="empty">Your bench is empty. <a href="#teams">Pick your teams ↗</a></p>'}`;
}
function renderHome(scores = false) {
  main.innerHTML = `<div class="page-heading reveal"><h1><span class="heading-slash" aria-hidden="true">/</span><span class="distort">${scores ? "THE SLATE." : "ICE TIME."}</span></h1><div class="heading-meta"><strong>SAT, OCT 03</strong><br>DEMO GAME NIGHT<span class="meta-extra"><br>4 GAMES. ONE GOOD NIGHT.</span></div></div>${scores ? "" : `<div class="home-top reveal">${feature()}${bench()}</div>`}<section aria-labelledby="slate-title"><div class="section-heading"><h2 id="slate-title">${scores ? "ALL THE ACTION." : "TONIGHT’S LINEUP."}</h2><div class="filters" aria-label="Filter games">${["all", "live", "favorites"].map((value) => `<button type="button" data-filter="${value}" aria-pressed="${filter === value}">${value === "all" ? "All games" : value === "live" ? "Live (2)" : "Favorites"}</button>`).join("")}</div></div><div class="slate reveal" id="slate">${slate()}</div><div class="slate-note"><span>All times Central · Stable start-time order · Illustrative slate</span><span>AI probabilities are samples, not current predictions.</span></div></section>`;
}
function rinkMarkup(event) {
  const endY = event.type === "miss" ? 112 : event.type === "block" ? 195 : 175;
  const number = String(selected + 1).padStart(2, "0");
  return `<div class="rink-direction"><span>← NSH ATTACKS</span><span>TOR ATTACKS →</span></div><svg class="rink" data-event-kind="${event.type}" viewBox="0 0 760 350" role="img" aria-labelledby="rink-title rink-desc"><title id="rink-title">Play ${number}: ${event.player}, ${event.type === "goal" ? "goal" : event.title}, third period ${event.time}</title><desc id="rink-desc">Top-down rink. Nashville attacks left; Toronto attacks right. Number ${number} marks the selected event location. Dashed line shows a sample shot direction, not puck tracking.</desc><defs><clipPath id="ice-clip"><rect x="14" y="14" width="732" height="322" rx="105"/></clipPath><marker id="arrow-tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#164eda"/></marker></defs><rect class="ice" x="14" y="14" width="732" height="322" rx="105"/><g clip-path="url(#ice-clip)"><path class="red-line" d="M70 0V350 M690 0V350"/><path class="blue-line" d="M268 0V350 M492 0V350"/><path class="red-line" stroke-dasharray="10 7" d="M380 0V350"/><circle class="center" cx="380" cy="175" r="52"/><circle class="center" cx="380" cy="175" r="4"/><path class="crease" d="M70 150A27 27 0 0 1 70 200Z M690 150A27 27 0 0 0 690 200Z"/>${[153, 607].flatMap((x) => [100, 250].map((y) => `<circle class="faceoff" cx="${x}" cy="${y}" r="51"/><circle class="dot" cx="${x}" cy="${y}" r="3"/><path class="faceoff" d="M${x - 15} ${y - 8}v16 M${x + 15} ${y - 8}v16"/>`)).join("")}<path class="goal" d="M68 160H54V190H68 M692 160H706V190H692"/><text class="center-logo" x="362" y="186">YH</text><text x="288" y="318">NEUTRAL ZONE</text></g>${event.net ? `<path class="shot-line" d="M${event.x} ${event.y}L${event.net} ${endY}" marker-end="url(#arrow-tip)"/><circle class="net-target" cx="${event.net}" cy="${endY}" r="6"/>` : ""}<circle class="target-ring" cx="${event.x}" cy="${event.y}" r="24"/>${event.type === "block" ? `<rect class="target" x="${event.x - 16}" y="${event.y - 16}" width="32" height="32"/>` : event.type === "save" ? `<path class="target" d="M${event.x} ${event.y - 21}L${event.x + 21} ${event.y}L${event.x} ${event.y + 21}L${event.x - 21} ${event.y}Z"/>` : `<circle class="target" cx="${event.x}" cy="${event.y}" r="16"/>`}<text class="event-number" text-anchor="middle" x="${event.x}" y="${event.y + 4}">${number}</text></svg><div class="rink-legend"><span><i class="legend-dot"></i>${number} / ${event.type.toUpperCase()}</span><span><i class="legend-dot orange-dot"></i>SHOT ENDPOINT</span></div>`;
}
function selectedMarkup() {
  const event = events[selected];
  return `<span class="selected-icon" aria-hidden="true">${event.icon}</span><div><h3>${event.type === "goal" ? "MATTHEWS. GO-AHEAD GOAL." : `${event.player.split(" ").at(-1)}. ${event.title}.`}</h3><p>${event.team} · ${event.detail}</p></div><div class="selected-clock">${event.time}<small>P3 / PLAY ${String(selected + 1).padStart(2, "0")}</small></div>`;
}
function filteredEvents() {
  return events
    .map((event, index) => ({ ...event, index }))
    .filter(
      (event) =>
        eventFilter === "all" ||
        (eventFilter === "goals"
          ? event.type === "goal"
          : ["save", "miss", "block", "goal"].includes(event.type)),
    );
}
function feedMarkup() {
  return `<div class="panel-title"><h2>THE SHIFT.</h2><span class="eyebrow">PLAY-BY-PLAY</span></div><div class="event-filters filters" aria-label="Filter events">${["all", "shots", "goals"].map((value) => `<button type="button" data-event-filter="${value}" aria-pressed="${eventFilter === value}">${value === "all" ? "All plays" : value === "shots" ? "Shots" : "Goals"}</button>`).join("")}</div><div id="events">${filteredEvents()
    .reverse()
    .map(
      (event) =>
        `<button type="button" class="event" data-event="${event.index}" aria-pressed="${event.index === selected}" aria-label="Play ${event.index + 1}: ${event.time}, ${event.player}, ${event.type === "goal" ? "goal" : event.title}"><span class="event-time">${event.time}<small>P3</small></span><span><strong>${event.type === "goal" ? "GOAL / TORONTO" : event.title.toUpperCase()}</strong><span class="event-detail">${event.player}<br>${event.detail.split(" · ").slice(0, 2).join(" · ")}</span></span><span class="event-mark"><span aria-hidden="true">${event.icon}</span><b>${String(event.index + 1).padStart(2, "0")}</b></span></button>`,
    )
    .join(
      "",
    )}</div><p class="feed-note">Select a play to find it on the ice.<br>Six illustrative events. No live feed.</p>`;
}
function scoreboard() {
  const event = events[selected];
  return `<div class="scoreboard"><div class="score-team">${mark("NSH")}<div><div class="place">NASHVILLE</div><div class="name">PREDATORS</div><div class="shots"><span id="away-shots">${event.shots[0]}</span> SHOTS ON GOAL</div></div></div><div class="score-middle"><span class="eyebrow" id="game-mode">${selected === 5 ? "LATEST DEMO" : "REPLAY / DEMO"}</span><div class="numbers"><span id="away-score">${event.score[0]}</span><span>:</span><span id="home-score">${event.score[1]}</span></div><span class="clock" id="game-clock">P3 / ${event.time}</span></div><div class="score-team">${mark("TOR")}<div><div class="place">TORONTO</div><div class="name">MAPLE LEAFS</div><div class="shots"><span id="home-shots">${event.shots[1]}</span> SHOTS ON GOAL</div></div></div></div>`;
}
function renderGame() {
  main.innerHTML = `<div class="crumb"><a href="#home">← HOME ICE</a><span>/</span><span>NSH AT TOR · DEMO</span></div><div class="match-heading"><h1>INSIDE THE GAME<span class="orange">.</span></h1><span class="eyebrow">SCOTIABANK ARENA<br>ILLUSTRATIVE GAME SEQUENCE</span></div>${scoreboard()}<div class="game-tabs" aria-label="Game sections">${["plays", "matchup", "pick"].map((value) => `<button type="button" data-tab="${value}" aria-pressed="${tab === value}">${value === "plays" ? "Game tracker" : value === "matchup" ? "Matchup" : "AI pick / 58%"}</button>`).join("")}</div><div id="game-content">${tab === "plays" ? `<div class="game-layout"><section class="rink-panel" aria-label="Rink and replay"><div class="panel-title"><h2>ON THE ICE.</h2><span class="eyebrow">ONE PLAY. A CLEAR PICTURE.</span></div><div class="rink-wrap" id="rink-wrap">${rinkMarkup(events[selected])}</div><div class="selected-play" id="selected-play">${selectedMarkup()}</div><div class="replay"><div class="transport"><button type="button" data-action="prev" aria-label="Previous play" ${selected === 0 ? "disabled" : ""}>|←</button><button type="button" class="play" data-action="play">${timer ? "Ⅱ PAUSE" : "▶ REPLAY"}</button><button type="button" data-action="next" aria-label="Next play" ${selected === 5 ? "disabled" : ""}>→|</button><button type="button" class="latest-demo" data-action="latest" aria-label="Return to latest demo play">LATEST</button><div class="replay-label"><strong id="replay-count">PLAY ${selected + 1} / 6</strong>DEMO REPLAY</div></div><input id="replay-range" class="replay-range" type="range" min="0" max="5" value="${selected}" aria-label="Select replay play" aria-valuetext="Play ${selected + 1} of 6"><div class="timeline-labels"><span>P3 / 10:10</span><span>6 SAMPLE PLAYS</span><span>08:42</span></div></div></section><aside class="feed" aria-label="Play-by-play">${feedMarkup()}</aside></div>` : tab === "matchup" ? matchupMarkup() : predictionMarkup()}</div><div class="game-bottom"><span>DEMO DATA · Play positions, sequence and statistics are illustrative.</span><span>Shot lines connect sample endpoints. They are not continuous puck tracking.</span></div>`;
}
function matchupMarkup() {
  return `<section class="stats-panel"><h2>THE GAME IN NUMBERS.</h2><p class="muted">NSH <span class="orange">/</span> TOR · Latest sample snapshot</p>${[
    ["Shots on goal", 24, 28],
    ["Hits", 18, 22],
    ["Faceoff wins", 25, 29],
    ["Penalty minutes", 6, 4],
  ]
    .map(
      ([name, a, b]) =>
        `<div class="stat"><strong>${a}</strong><div><small>${name.toUpperCase()}</small><div class="stat-bars"><span style="width:${(a / (a + b)) * 100}%"></span><span style="width:${(b / (a + b)) * 100}%"></span></div></div><strong>${b}</strong></div>`,
    )
    .join("")}<span class="sample-tag">ILLUSTRATIVE STATISTICS</span></section>`;
}
function predictionMarkup() {
  return `<section class="stats-panel"><h2>THE EDGE, BEFORE THE PUCK DROPS.</h2><div class="prediction-head">${mark("TOR")}<div><strong>58%</strong><p>TORONTO WIN PROBABILITY</p></div></div><p class="prediction-copy">They have the better record and the healthier lineup. Their starter has a .926 save percentage over his last five, and the other side played last night.</p><p class="prediction-copy muted">A rested, healthy lineup / Goaltending form / Opponent on a back-to-back</p><span class="sample-tag">EXISTING SEEDED AI PICK · SAMPLE REASONING · NOT A LIVE MODEL OUTPUT</span></section>`;
}
function renderTeams() {
  main.innerHTML = `<div class="page-heading"><h1><span class="heading-slash" aria-hidden="true">/</span>YOUR BENCH.</h1></div><p class="muted">Pick your people. Stars stay visible without reshuffling the slate.</p><div class="teams-grid">${Object.entries(
    teams,
  )
    .map(
      ([code, team]) =>
        `<article class="team-card">${mark(code)}<div><small>${team.city.toUpperCase()}</small><h2>${team.name}</h2></div>${star(code)}</article>`,
    )
    .join(
      "",
    )}</div><p class="slate-note">Favorites are saved in this browser for the prototype. Eight sample teams.</p>`;
}
function renderMatch(id) {
  const game = games.find((item) => item.id === id);
  if (!game) {
    location.hash = "scores";
    return;
  }
  main.innerHTML = `<div class="crumb"><a href="#scores">← SCORES</a><span>/</span><span>SAMPLE MATCHUP</span></div><section class="sample-detail"><span class="sample-tag">DESIGN PREVIEW / ILLUSTRATIVE SLATE</span><h2>${game.away} ${game.a} <span class="orange">/</span> ${game.home} ${game.h}</h2><p>${teams[game.away].city} ${teams[game.away].name}<br>at ${teams[game.home].city} ${teams[game.home].name}</p><p>${game.time} · ${game.tv}</p><p>${game.pick ? `Sample AI pick: ${game.pick} ${game.probability}%` : "No AI pick available for this sample."}</p><p>The interactive rink and replay are demonstrated in Nashville at Toronto.</p><a class="cta" href="#game">OPEN THE GAME TRACKER <span class="arrow">↗</span></a></section>`;
}
function pause() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  const button = document.querySelector('[data-action="play"]');
  if (button) button.textContent = "▶ REPLAY";
}
function selectPlay(index, speak = true) {
  selected = Math.max(0, Math.min(events.length - 1, index));
  const event = events[selected];
  if (!document.querySelector("#rink-wrap")) return;
  document.querySelector("#rink-wrap").innerHTML = rinkMarkup(event);
  document.querySelector("#selected-play").innerHTML = selectedMarkup();
  document.querySelectorAll("[data-event]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.event) === selected));
  });
  document.querySelector("#away-score").textContent = event.score[0];
  document.querySelector("#home-score").textContent = event.score[1];
  document.querySelector("#away-shots").textContent = event.shots[0];
  document.querySelector("#home-shots").textContent = event.shots[1];
  document.querySelector("#game-mode").textContent =
    selected === 5 ? "LATEST DEMO" : "REPLAY / DEMO";
  document.querySelector("#game-clock").textContent = `P3 / ${event.time}`;
  document.querySelector("#replay-count").textContent = `PLAY ${selected + 1} / 6`;
  const range = document.querySelector("#replay-range");
  range.value = selected;
  range.setAttribute(
    "aria-valuetext",
    `Play ${selected + 1} of 6, ${event.player}, ${event.type === "goal" ? "goal" : event.title}`,
  );
  document.querySelector('[data-action="prev"]').disabled = selected === 0;
  document.querySelector('[data-action="next"]').disabled = selected === 5;
  if (speak)
    announce(
      `Play ${selected + 1}, ${event.player}, ${event.type === "goal" ? "goal" : event.title}, third period ${event.time}`,
    );
}
function route(focus = false) {
  pause();
  const routeName = location.hash.slice(1) || "home";
  const nav = routeName === "game" || routeName.startsWith("match/") ? "scores" : routeName;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === nav) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (routeName === "game") renderGame();
  else if (routeName === "teams") renderTeams();
  else if (routeName.startsWith("match/")) renderMatch(routeName.split("/")[1]);
  else renderHome(routeName === "scores");
  document.title = `${routeName === "game" ? "NSH at TOR" : routeName === "teams" ? "Your bench" : routeName === "scores" ? "Scores" : "Home ice"} · Yogan Hockey design preview`;
  if (focus) {
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.id === "theme-toggle") {
    theme = theme === "dark" ? "light" : "dark";
    persist("hockey-design-117-theme", theme);
    applyTheme();
    return;
  }
  if (button.dataset.favorite) {
    const code = button.dataset.favorite;
    if (favorites.has(code)) favorites.delete(code);
    else favorites.add(code);
    persist("hockey-design-117-favorites", [...favorites]);
    document.querySelectorAll(`[data-favorite="${code}"]`).forEach((item) => {
      item.setAttribute("aria-pressed", String(favorites.has(code)));
      item.textContent = favorites.has(code) ? "★" : "☆";
    });
    if (document.querySelector("#slate")) document.querySelector("#slate").innerHTML = slate();
    announce(`${teams[code].name} ${favorites.has(code) ? "added to" : "removed from"} favorites`);
    return;
  }
  if (button.dataset.filter) {
    filter = button.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((item) => {
      item.setAttribute("aria-pressed", String(item.dataset.filter === filter));
    });
    document.querySelector("#slate").innerHTML = slate();
    announce(`${document.querySelectorAll(".game-row").length} sample games shown`);
    return;
  }
  if (button.dataset.tab) {
    pause();
    tab = button.dataset.tab;
    renderGame();
    document.querySelector(`[data-tab="${tab}"]`).focus();
    return;
  }
  if (button.dataset.eventFilter) {
    pause();
    eventFilter = button.dataset.eventFilter;
    document.querySelector(".feed").innerHTML = feedMarkup();
    document.querySelector(`[data-event-filter="${eventFilter}"]`).focus();
    selectPlay(filteredEvents().at(-1).index);
    return;
  }
  if (button.dataset.event !== undefined) {
    pause();
    selectPlay(Number(button.dataset.event));
    return;
  }
  if (button.dataset.action) {
    const action = button.dataset.action;
    if (action === "play") {
      if (timer) {
        pause();
        return;
      }
      if (eventFilter !== "all") {
        eventFilter = "all";
        document.querySelector(".feed").innerHTML = feedMarkup();
      }
      if (selected === 5) selectPlay(0);
      timer = setInterval(() => {
        selectPlay(selected + 1);
        if (selected === 5) pause();
      }, 1800);
      button.textContent = "Ⅱ PAUSE";
    } else {
      pause();
      if (eventFilter !== "all") {
        eventFilter = "all";
        document.querySelector(".feed").innerHTML = feedMarkup();
      }
      selectPlay(action === "prev" ? selected - 1 : action === "next" ? selected + 1 : 5);
    }
  }
});
document.addEventListener("input", (event) => {
  if (event.target.id === "replay-range") {
    pause();
    if (eventFilter !== "all") {
      eventFilter = "all";
      document.querySelector(".feed").innerHTML = feedMarkup();
    }
    selectPlay(Number(event.target.value));
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("hashchange", () => route(true));
applyTheme();
route();
