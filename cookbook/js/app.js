/* The cookbook app: which page is showing, what's written on it, and how we flip between them. */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const cfg = window.COOKBOOK_CONFIG || {};

  const pageL = $("#pageL"), pageR = $("#pageR"), pages = $("#pages"), stage = $("#stage");
  const S = { pose: "closed", view: "loading", gPage: 0, gQuery: "", gCat: "All", recipe: null, spread: 0, step: 0, busy: false, scale: 10 };

  /* ================= layout ================= */
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const compact = vw < 640 || vw / vh < 0.75;
    document.body.classList.toggle("compact", compact);
    // Fill the window: the view is cropped to just the book plus room for the page-flip curls above it.
    let s = compact ? (vw - 8) / Book.W : Math.min((vw - 16) / Book.W, (vh - 4) / Book.VIEW_H);
    s = Math.floor(s * 4) / 4; // quarter-pixel steps keep the pixel art even without wasting space
    S.scale = s;
    document.documentElement.style.setProperty("--s", s + "px");
    const w = Book.W * s, h = Book.VIEW_H * s;
    Object.assign(stage.style, { width: w + "px", height: h + "px" });
    const canvas = $("#book");
    Object.assign(canvas.style, { width: w + "px", height: Book.H * s + "px", top: -Book.VIEW_TOP * s + "px" });
    if (compact) { stage.style.left = (vw - w) / 2 + "px"; stage.style.top = "44px"; }
    else { stage.style.left = (vw - w) / 2 + "px"; stage.style.top = Math.max(0, (vh - h) / 2) + "px"; }
    Object.assign(pages.style, compact ? { left: "", top: "", width: "", height: "" } : { left: stage.style.left, top: stage.style.top, width: w + "px", height: h + "px" });
    placePages();
  }
  function placePages() {
    const rects = Book.PAGES[S.pose] || Book.PAGES.plain, s = S.scale;
    for (const [el, r] of [[pageL, rects.L], [pageR, rects.R]]) {
      el.classList.toggle("unused", !r);
      if (!r || document.body.classList.contains("compact")) { el.style.cssText = ""; continue; }
      Object.assign(el.style, { left: r[0] * s + "px", top: (r[1] - Book.VIEW_TOP) * s + "px", width: r[2] * s + "px", height: r[3] * s + "px" });
    }
    pageL.classList.toggle("on-red", S.pose === "cover");
    pageR.classList.toggle("on-red", S.pose === "back");
  }
  addEventListener("resize", layout);

  /* ================= page flipping ================= */
  function hide() { pageL.classList.remove("show"); pageR.classList.remove("show"); }
  function show(spread) {
    placePages();
    pageL.innerHTML = spread.L || ""; pageR.innerHTML = spread.R || "";
    spread.mount && spread.mount();
    if (document.body.classList.contains("compact")) document.body.scrollTop = 0;
    requestAnimationFrame(() => { pageL.classList.add("show"); if (spread.R !== undefined) pageR.classList.add("show"); });
  }
  // Steps needed to get the book to a plain open page from wherever it is
  function toPlain() {
    return {
      closed: [["intro", { fps: 9 }], ["glossary"]], cover: [["glossary"]], plain: [],
      ribbon: [["markfold", { fps: 15 }]], back: [["end", { reverse: true }]],
    }[S.pose];
  }
  async function go(steps, pose, render) {
    if (S.busy) return;
    S.busy = true;
    hide();
    await wait(steps.length ? 150 : 60);
    for (const [seq, opts] of steps) await Book.play(seq, opts);
    S.pose = pose; Book.setPose(pose);
    try { show(render()); } finally { S.busy = false; }
  }

  /* ================= views ================= */
  const nav = {
    cover() {
      const steps = { closed: [["intro", { fps: 9 }]], cover: [], plain: [["glossary", { reverse: true }]], ribbon: [["markfold", { fps: 15 }], ["glossary", { reverse: true }]], back: [["end", { reverse: true }], ["glossary", { reverse: true }]] }[S.pose];
      S.view = "cover"; route("");
      return go(steps, "cover", viewCover);
    },
    glossary(page = 0) {
      let steps = toPlain();
      if (S.view === "glossary" && S.pose === "plain") steps = page > S.gPage ? [["nextgloss"]] : page < S.gPage ? [["next", { reverse: true }]] : [];
      S.gPage = page; S.view = "glossary"; route("glossary");
      return go(steps, "plain", viewGlossary);
    },
    recipe(id, spread = 0) {
      const r = Store.get(id); if (!r) return toast("Recipe not found");
      let steps;
      if (S.view === "recipe" && S.recipe && S.recipe.id === id) {
        if (S.spread === spread) return;
        if (S.spread === 2) steps = [["end", { reverse: true }], ["recipe"]];
        else if (spread === 2) steps = [["markfold", { fps: 16 }], ["end"]];
        else steps = [["nextrecipe", { fps: 18, reverse: spread < S.spread }]];
      } else { steps = [...toPlain(), ["recipe"]]; S.step = 0; }
      S.recipe = r; S.view = "recipe"; S.spread = spread; route("recipe/" + encodeURIComponent(id));
      return go(steps, spread === 2 ? "back" : "ribbon", spread === 0 ? viewOverview : spread === 1 ? viewCook : viewFinal);
    },
    async close() {
      const shut = ["intro", { reverse: true, fps: 10 }], back = ["glossary", { reverse: true }];
      const steps = { closed: [], cover: [shut], plain: [back, shut], ribbon: [["markfold", { fps: 15 }], back, shut], back: [["end", { reverse: true }], back, shut] }[S.pose];
      S.view = "closed"; route("");
      await go(steps, "closed", viewClosed);
    },
  };

  function route(r) { try { history.replaceState(null, "", r ? "#/" + r : location.pathname + location.search); } catch {} }

  /* ---------- closed book / loading ---------- */
  function viewClosed() {
    return {
      L: `<div class="closed-msg"><h1 class="pixel">Digital<br>Cookbook</h1><button class="btn btn-red" data-act="open">Open the book ▶︎</button></div>`,
    };
  }
  function viewLoading() {
    return { L: `<div class="closed-msg"><h1 class="pixel">Digital<br>Cookbook</h1><p class="pixel loading-txt">Loading recipes…</p><div class="bar"><i id="load-bar"></i></div></div>` };
  }

  /* ---------- cover: search ---------- */
  function viewCover() {
    const n = Store.all.length;
    return {
      L: `<div class="cover-title"><span class="pixel tiny">~ the ~</span><h1 class="pixel">Digital<br>Cookbook</h1><span class="pixel count">${n} recipe${n === 1 ? "" : "s"} inside</span></div>
          <div class="foot col"><button class="btn small" data-act="add">+ Add a recipe</button><button class="btn small" data-act="close">Close book</button></div>`,
      R: `<h2 class="pixel">Find a recipe</h2>
          <input id="q" type="search" placeholder="Search a dish or ingredient…" autocomplete="off" aria-label="Search recipes" />
          <ul id="results" class="scroll results"></ul>
          <div class="foot"><button class="btn small" data-act="surprise">🎲 Surprise</button><button class="btn btn-red" data-act="glossary">Glossary ▶︎</button></div>`,
      mount() {
        const q = $("#q"), list = $("#results");
        const render = () => {
          const found = Store.search(q.value);
          list.innerHTML = found.length
            ? (q.value ? "" : `<li class="hint">All recipes</li>`) + found.slice(0, 30).map((r) => `<li><button class="result" data-recipe="${esc(r.id)}"><b>${esc(r.name)}</b><span>${esc(r.category)}${r.time ? " · " + esc(r.time) : ""}</span></button></li>`).join("")
            : `<li class="hint">Sorry, there's no recipe for "${esc(q.value)}" yet.</li>`;
        };
        q.addEventListener("input", render);
        q.addEventListener("keydown", (e) => { if (e.key === "Enter") { const f = Store.search(q.value)[0]; if (f) nav.recipe(f.id); } });
        render();
        if (!document.body.classList.contains("compact")) q.focus({ preventScroll: true });
      },
    };
  }

  /* ---------- glossary ---------- */
  let PER_L = 5, PER_R = 7; // recalculated to fit the page size
  function glossList() {
    return Store.search(S.gQuery).filter((r) => S.gCat === "All" || r.category === S.gCat).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  }
  function entry(r) {
    return `<button class="entry" data-recipe="${esc(r.id)}">${thumb(r)}<span><span class="nm">${esc(r.name)}</span><span class="meta">${esc(r.category)}${r.time ? " · " + esc(r.time) : ""}</span></span></button>`;
  }
  function thumb(r) { return r.image ? `<img class="th" src="${esc(r.image)}" alt="" loading="lazy">` : `<canvas class="th" data-dish="${esc(r.id)}"></canvas>`; }
  function viewGlossary() {
    const cats = ["All", ...Store.categories()];
    return {
      L: `<div class="gl-head"><h2 class="pixel">Glossary</h2>
            <select id="gcat" aria-label="Category">${cats.map((c) => `<option ${c === S.gCat ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
          <input id="gq" type="search" placeholder="Filter…" value="${esc(S.gQuery)}" autocomplete="off" aria-label="Filter recipes" />
          <div id="entL" class="entries"></div>
          <div class="foot"><button class="btn small" id="gprev"></button><span class="pg" id="pgL"></span></div>`,
      R: `<div id="entR" class="entries"></div>
          <div class="foot"><span class="pg" id="pgR"></span><button class="btn small" id="gnext" data-act="gnext">▶︎</button></div>`,
      mount() {
        fillGlossary();
        $("#gq").addEventListener("input", (e) => { S.gQuery = e.target.value; S.gPage = 0; fillGlossary(); });
        $("#gcat").addEventListener("change", (e) => { S.gCat = e.target.value; S.gPage = 0; fillGlossary(); });
      },
    };
  }
  function fillGlossary() {
    const list = glossList(), compact = document.body.classList.contains("compact");
    if (!compact) { // how many entries fit on each page?
      const probe = document.createElement("div"); probe.innerHTML = entry({ id: "", name: "Xg", category: "X", time: "1" });
      $("#entL").append(probe); const h = probe.offsetHeight || 30; probe.remove();
      PER_L = Math.max(3, Math.floor($("#entL").clientHeight / h)); PER_R = Math.max(3, Math.floor($("#entR").clientHeight / h));
    }
    const PER = PER_L + PER_R;
    const pagesN = Math.max(1, Math.ceil(list.length / PER));
    S.gPage = Math.min(S.gPage, pagesN - 1);
    const items = compact ? list : list.slice(S.gPage * PER, S.gPage * PER + PER);
    $("#entL").innerHTML = items.length ? items.slice(0, compact ? items.length : PER_L).map(entry).join("") : `<p class="hint">No recipes match.</p>`;
    $("#entR").innerHTML = compact ? "" : items.slice(PER_L).map(entry).join("");
    $("#pgL").textContent = S.gPage * 2 + 1; $("#pgR").textContent = S.gPage * 2 + 2;
    const prev = $("#gprev");
    prev.textContent = S.gPage > 0 ? "◀︎" : "◀︎ Cover"; prev.dataset.act = S.gPage > 0 ? "gprev" : "cover";
    $("#gnext").disabled = S.gPage >= pagesN - 1;
    drawThumbs();
  }
  function drawThumbs(root = pages) { $$("canvas[data-dish]", root).forEach((c) => { const r = Store.get(c.dataset.dish); if (r) Art.dish(c, r.art); }); }

  /* ---------- recipe: picture + ingredients ---------- */
  function picture(r, final) {
    const src = final ? r.finalImage || r.image : r.image;
    return src ? `<figure class="pic"><img src="${esc(src)}" alt="${esc(r.name)}"></figure>` : `<figure class="pic"><canvas class="${final ? "final-dish" : "hero-dish"}"></canvas></figure>`;
  }
  function viewOverview() {
    const r = S.recipe;
    return {
      L: `<div class="scroll">
            <span class="tag">${esc(r.category)}</span>
            <h2 class="pixel rname">${esc(r.name)}</h2>
            <div class="meta-row">${r.time ? `<span>⏱ ${esc(r.time)}</span>` : ""}${r.servings ? `<span>🍽 ${esc(r.servings)}</span>` : ""}${r.difficulty ? `<span>★ ${esc(r.difficulty)}</span>` : ""}</div>
            ${picture(r)}
            <p class="desc">${esc(r.description)}</p>
            ${r.source ? `<p class="src">📖 From: ${esc(r.source)}</p>` : ""}
          </div>
          <div class="foot"><button class="btn small" data-act="glossary">◀︎ Glossary</button>${r.origin === "local" ? `<button class="btn small" data-act="remove">Remove</button>` : ""}</div>`,
      R: `<div class="scroll">
            <h3 class="pixel">Ingredients</h3>
            <ul class="ings">${r.ingredients.map((i) => `<li><span class="amt">${esc(i.amount)}</span> ${esc(i.item)}${i.where ? `<small class="where">📍 ${esc(i.where)}</small>` : ""}</li>`).join("") || `<li class="hint">No ingredients listed.</li>`}</ul>
            ${r.look ? `<div class="look"><h4 class="pixel">What it should look like</h4><p>${esc(r.look)}</p></div>` : ""}
          </div>
          <div class="foot"><span></span><button class="btn btn-red" data-act="cook">Start cooking ▶︎</button></div>`,
      mount() { const c = $(".hero-dish"); if (c) Art.dish(c, r.art, { animate: true }); },
    };
  }

  /* ---------- recipe: step-by-step with tutorial + timer ---------- */
  function viewCook() {
    return {
      L: `<div class="scroll cook-left">
            <div class="stepno pixel" id="stepno"></div>
            <canvas class="tut" id="tut" aria-label="Animated tutorial"></canvas>
            <div class="act-label pixel" id="actlabel"></div>
            <div class="timer" id="timerbox"></div>
          </div>
          <div class="foot"><button class="btn small" data-act="overview">◀︎ Ingredients</button></div>`,
      R: `<div class="scroll">
            <p class="step-now" id="stepnow"></p>
            <ol class="steps-list" id="steplist"></ol>
          </div>
          <div class="foot"><button class="btn small" data-act="sprev" id="sprev">◀︎</button><button class="btn btn-red" data-act="snext" id="snext"></button></div>`,
      mount() { fillStep(); },
    };
  }
  function fillStep(animate) {
    const r = S.recipe, st = r.steps[S.step], n = r.steps.length;
    if (!st) { $("#stepnow").textContent = "This recipe has no steps yet."; return; }
    $("#stepno").textContent = `Step ${S.step + 1} of ${n}`;
    const a = Art.tutorial($("#tut"), st.action, r.art);
    $("#actlabel").textContent = a.charAt(0).toUpperCase() + a.slice(1);
    const now = $("#stepnow");
    now.textContent = st.text;
    if (animate) { now.classList.remove("swap"); void now.offsetWidth; now.classList.add("swap"); }
    $("#steplist").innerHTML = r.steps.map((s, i) => `<li class="${i === S.step ? "cur" : ""}${i < S.step ? " done" : ""}" data-step="${i}">${esc(s.text)}</li>`).join("");
    const cur = $("#steplist .cur"); if (cur) cur.scrollIntoView({ block: "nearest" });
    $("#sprev").disabled = S.step === 0;
    $("#snext").textContent = S.step === n - 1 ? "Finish ▶︎" : "Next ▶︎";
    renderTimerBox();
  }

  /* ---------- final product ---------- */
  function viewFinal() {
    const r = S.recipe;
    return {
      L: `<div class="scroll"><h2 class="pixel">Final product</h2>${picture(r, true)}${r.look ? `<p class="look-final"><b>Looks like:</b> ${esc(r.look)}</p>` : ""}</div>
          <div class="foot"><button class="btn small" data-act="cook">◀︎ Steps</button></div>`,
      R: `<div class="fin"><p class="pixel big">Bon appétit,<br>chef!</p><p>You made<br><b>${esc(r.name)}</b></p></div>
          <div class="foot col"><button class="btn small" data-act="again">↺ Cook again</button><button class="btn small" data-act="glossary">Glossary</button><button class="btn small" data-act="cover">Cover</button></div>`,
      mount() { const c = $(".final-dish"); if (c) Art.dish(c, r.art, { animate: true, final: true }); },
    };
  }

  /* ================= timers ================= */
  const timers = new Map();
  const fmt = (sec) => { sec = Math.max(0, Math.ceil(sec)); return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`; };
  const tKey = () => S.recipe.id + "#" + S.step;
  function timerFor(key, create) {
    if (!timers.has(key) && create) {
      const [id, i] = key.split("#"), r = Store.get(id), st = r.steps[+i];
      timers.set(key, { key, label: `${r.name} · step ${+i + 1}`, total: st.timer || 0, left: st.timer || 0, running: false, done: false, last: 0 });
    }
    return timers.get(key);
  }
  function renderTimerBox() {
    const box = $("#timerbox"); if (!box) return;
    const st = S.recipe.steps[S.step];
    const t = timerFor(tKey(), false) || { left: st.timer || 0, running: false, done: false };
    box.classList.toggle("done", !!t.done);
    box.classList.toggle("none", !t.left && !t.running && !t.done);
    box.innerHTML = `<span class="digits pixel">${t.left || t.running || t.done ? fmt(t.left) : "--:--"}</span>
      <span class="tbtns"><button class="btn small" data-act="tstart" title="${t.running ? "Pause" : "Start"}">${t.running ? "❚❚" : "▶︎"}</button><button class="btn small" data-act="treset" title="Reset">⟲</button><button class="btn small" data-act="tplus" title="Add a minute">+1m</button></span>
      <small class="tnote">${t.done ? "Time's up!" : st.timer ? "Suggested time" : "Optional timer"}</small>`;
  }
  function renderChips() {
    const list = [...timers.values()].filter((t) => t.running || t.done || t.left !== t.total);
    $("#timers").innerHTML = list.map((t) => `<span class="chip ${t.done ? "done" : ""}" title="${esc(t.label)}"><b class="pixel">${fmt(t.left)}</b><span class="lbl">${esc(t.label)}</span><button data-chip="${esc(t.key)}" aria-label="Dismiss timer">✕</button></span>`).join("");
  }
  setInterval(() => {
    const now = performance.now();
    let changed = false;
    for (const t of timers.values()) {
      if (!t.running) continue;
      t.left -= (now - t.last) / 1000; t.last = now; changed = true;
      if (t.left <= 0) { t.left = 0; t.running = false; t.done = true; alarm(t); }
    }
    if (changed) { renderChips(); if (S.view === "recipe" && S.spread === 1) { const d = $("#timerbox .digits"); const t = timers.get(tKey()); if (d && t) d.textContent = fmt(t.left); if (t && t.done) renderTimerBox(); } }
  }, 250);
  let audio;
  function beep() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5, 0.9, 1.15, 1.4].forEach((d, i) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.type = "square"; o.frequency.value = i % 3 === 2 ? 1046 : 784;
        g.gain.setValueAtTime(0.08, audio.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + d + 0.2);
        o.connect(g).connect(audio.destination); o.start(audio.currentTime + d); o.stop(audio.currentTime + d + 0.22);
      });
    } catch {}
  }
  function alarm(t) {
    beep(); toast(`⏰ Time's up: ${t.label}`, 6000);
    try { if ("Notification" in window && Notification.permission === "granted") new Notification("Time's up!", { body: t.label, icon: "icons/icon-192.png" }); } catch {}
  }

  /* ================= clicks & keys ================= */
  const actions = {
    open: () => nav.cover(), cover: () => nav.cover(), glossary: () => nav.glossary(S.view === "glossary" ? S.gPage : 0),
    close: () => nav.close(),
    gnext: () => nav.glossary(S.gPage + 1), gprev: () => nav.glossary(S.gPage - 1),
    surprise: () => { const a = Store.all; if (a.length) nav.recipe(a[Math.floor(Math.random() * a.length)].id); },
    cook: () => nav.recipe(S.recipe.id, 1), overview: () => nav.recipe(S.recipe.id, 0),
    again: () => { S.step = 0; nav.recipe(S.recipe.id, 0); },
    sprev: () => { if (S.step > 0) { S.step--; fillStep(true); } },
    snext: () => { if (S.step < S.recipe.steps.length - 1) { S.step++; fillStep(true); } else nav.recipe(S.recipe.id, 2); },
    tstart: () => {
      const t = timerFor(tKey(), true);
      if (t.running) t.running = false;
      else { if (t.left <= 0) { t.left = t.total || 60; t.done = false; } if (!t.total) t.total = t.left; t.running = true; t.last = performance.now(); askNotify(); }
      renderTimerBox(); renderChips();
    },
    treset: () => { const t = timerFor(tKey(), true); t.running = false; t.done = false; t.left = t.total; renderTimerBox(); renderChips(); },
    tplus: () => { const t = timerFor(tKey(), true); t.left += 60; t.done = false; renderTimerBox(); renderChips(); },
    add: () => openAddDialog(),
    remove: async () => { if (!confirm(`Remove "${S.recipe.name}" from this device?`)) return; await Store.removeLocal(S.recipe.id); toast("Recipe removed"); nav.glossary(0); },
  };
  pages.addEventListener("click", (e) => {
    const a = e.target.closest("[data-act]"), rcp = e.target.closest("[data-recipe]"), step = e.target.closest("[data-step]");
    if (a && !a.disabled && actions[a.dataset.act]) actions[a.dataset.act]();
    else if (rcp) nav.recipe(rcp.dataset.recipe);
    else if (step) { S.step = +step.dataset.step; fillStep(true); }
  });
  $("#timers").addEventListener("click", (e) => { const b = e.target.closest("[data-chip]"); if (b) { timers.delete(b.dataset.chip); renderChips(); renderTimerBox(); } });
  addEventListener("keydown", (e) => {
    if (e.target.matches("input, textarea, select") || $("#add-dialog").open || S.busy) return;
    const k = e.key;
    if (S.view === "glossary") { if (k === "ArrowRight" && !$("#gnext").disabled) actions.gnext(); if (k === "ArrowLeft") actions[S.gPage > 0 ? "gprev" : "cover"](); }
    else if (S.view === "recipe") {
      if (S.spread === 1 && k === "ArrowRight") actions.snext();
      else if (S.spread === 1 && k === "ArrowLeft") S.step > 0 ? actions.sprev() : actions.overview();
      else if (S.spread === 0 && k === "ArrowRight") actions.cook();
      else if (S.spread === 0 && k === "ArrowLeft") actions.glossary();
      else if (S.spread === 2 && k === "ArrowLeft") actions.cook();
      else if (k === " " && S.spread === 1) { e.preventDefault(); actions.tstart(); }
    } else if (S.view === "cover" && k === "ArrowRight") actions.glossary();
    if (k === "Escape") { if (S.view === "recipe") actions.glossary(); else if (S.view === "glossary") actions.cover(); }
  });
  function askNotify() { try { if ("Notification" in window && Notification.permission === "default") Notification.requestPermission(); } catch {} }

  /* ================= add-a-recipe form ================= */
  const dlg = $("#add-dialog"), form = $("#add-form");
  const actionOptions = Art.ACTION_NAMES.map((a) => `<option value="${a}">${a}</option>`).join("");
  function addRow(kind) {
    const div = document.createElement("div");
    div.className = "row " + kind;
    div.innerHTML = kind === "ing"
      ? `<input placeholder="Amount" data-f="amount"><input placeholder="Ingredient" data-f="item"><input placeholder="Where to find it (aisle / store)" data-f="where"><button type="button" class="btn small" data-del>✕</button>`
      : `<textarea rows="2" placeholder="What to do…" data-f="text"></textarea><select data-f="action">${actionOptions}</select><input type="number" min="0" step="0.5" placeholder="min" data-f="timer" title="Timer (minutes)"><button type="button" class="btn small" data-del>✕</button>`;
    $(kind === "ing" ? "#ing-rows" : "#step-rows").append(div);
  }
  function openAddDialog() {
    form.reset(); $("#ing-rows").innerHTML = ""; $("#step-rows").innerHTML = ""; $("#form-error").textContent = "";
    for (let i = 0; i < 3; i++) addRow("ing");
    for (let i = 0; i < 2; i++) addRow("step");
    $("#cat-list").innerHTML = Store.categories().map((c) => `<option value="${esc(c)}">`).join("");
    $("#btn-export").hidden = !Store.localCount;
    dlg.showModal();
  }
  dlg.addEventListener("click", async (e) => {
    if (e.target.closest("[data-close]")) dlg.close();
    const del = e.target.closest("[data-del]"); if (del) del.parentElement.remove();
    const add = e.target.closest("[data-add-row]"); if (add) addRow(add.dataset.addRow);
    if (e.target.id === "btn-export") {
      const { text, files } = Store.exportLocal();
      download("my-recipes.txt", new Blob([text], { type: "text/plain" }));
      for (const f of files) { await wait(300); download(f.name, await (await fetch(f.dataUrl)).blob()); }
      toast(files.length ? `Downloaded the recipe text + ${files.length} picture${files.length > 1 ? "s" : ""}` : "Downloaded the recipe text");
    }
  });
  async function shrink(file) {
    if (!file || !file.size) return null;
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return new Promise((res) => c.toBlob(res, "image/jpeg", 0.82));
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(form), err = $("#form-error");
    const rows = (sel) => $$(sel).map((row) => Object.fromEntries($$("[data-f]", row).map((i) => [i.dataset.f, i.value.trim()])));
    const ingredients = rows("#ing-rows .row").filter((i) => i.item);
    const steps = rows("#step-rows .row").filter((s) => s.text).map((s) => ({ text: s.text, action: s.action, timer: s.timer ? Math.round(parseFloat(s.timer) * 60) : 0 }));
    const name = String(f.get("name") || "").trim();
    if (!name) { err.textContent = "Please give the recipe a name."; return; }
    if (!steps.length) { err.textContent = "Please add at least one step."; return; }
    const btn = $("#btn-save"); btn.disabled = true; btn.textContent = "Saving…"; err.textContent = "";
    try {
      const recipe = {
        name, category: String(f.get("category") || "Other").trim() || "Other", time: f.get("time"), servings: f.get("servings"),
        difficulty: f.get("difficulty"), description: f.get("description"), source: f.get("source"), look: f.get("look"),
        art: { dish: f.get("dish"), food: f.get("food"), accent: "#8a4b22" }, ingredients, steps,
      };
      const id = await Store.add(recipe, { image: await shrink(f.get("image")), finalImage: await shrink(f.get("finalImage")) });
      dlg.close();
      toast("Saved on this device");
      nav.recipe(id);
    } catch (ex) { err.textContent = ex.message || "Couldn't save the recipe."; }
    finally { btn.disabled = false; btn.textContent = "Save recipe"; }
  });
  function download(name, blob) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

  /* ================= misc ================= */
  let toastTimer;
  function toast(msg, ms = 2800) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms); }

  function setupChrome() {
    $("#btn-add").onclick = () => openAddDialog();
    const installed = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const web = location.protocol.startsWith("http");
    if (web && "serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
    if (cfg.zipUrl) $("#zip-link").href = cfg.zipUrl; else $("#zip-row").hidden = true;
    if (installed) return; // already running as an installed app
    const btn = $("#btn-install"), help = $("#install-dialog");
    btn.hidden = false;
    let prompt = null;
    addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); prompt = e; });
    addEventListener("appinstalled", () => { btn.hidden = true; toast("Installed! Look for the Cookbook icon on your desktop or Start menu."); });
    btn.onclick = async () => {
      if (prompt) { prompt.prompt(); const r = await prompt.userChoice; prompt = null; if (r.outcome === "accepted") btn.hidden = true; return; }
      help.showModal(); // browser can't install directly — show how
    };
    help.addEventListener("click", (e) => { if (e.target.closest("[data-close]") || e.target === help) help.close(); });
  }

  /* ================= start ================= */
  async function boot() {
    Book.init($("#book"));
    setupChrome();
    layout();
    S.pose = "closed";
    show(viewLoading());
    let wobble = true;
    (async () => { await wait(150); while (wobble) { for (const i of [0, 2, 0]) { if (!wobble) break; Book.draw("intro", i); await wait(i ? 260 : 900); } } })();
    await Promise.all([
      Book.preload((p) => { const b = $("#load-bar"); if (b) b.style.width = Math.round(p * 100) + "%"; }),
      Store.load(), wait(1400),
    ]);
    wobble = false;
    const m = location.hash.match(/^#\/recipe\/(.+)$/);
    if (m && Store.get(decodeURIComponent(m[1]))) return nav.recipe(decodeURIComponent(m[1]));
    if (location.hash === "#/glossary") return nav.glossary(0);
    nav.cover();
  }
  boot();
})();
