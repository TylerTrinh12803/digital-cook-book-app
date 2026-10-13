/* Where recipes come from — no database needed:
   1. js/recipes.js on your website (GitHub Pages). Edit that one file and everyone gets the update:
      the website and installed app show it within a few minutes; downloaded copies load it from the website.
   2. The copy of js/recipes.js packed inside the app — used when there's no internet.
   3. "+ Add recipe" — saved on that device only (a personal notebook). */
const Store = (() => {
  const cfg = window.COOKBOOK_CONFIG || {};
  const SITE = (cfg.siteUrl || "").replace(/\/$/, "");
  const LOCAL = "cookbook.myRecipes";
  let all = [], local = [], updated = false;

  const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const slug = (s) => String(s || "recipe").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "recipe";
  const isRelative = (u) => u && !/^(https?:|data:|blob:|\/)/.test(u);

  function normalize(r, origin, base) {
    const fix = (u) => (base && isRelative(u) ? base + "/" + u : u || "");
    const steps = (r.steps || []).map((s) => (typeof s === "string" ? { text: s } : s)).filter((s) => s && s.text);
    return {
      id: r.id || slug(r.name), name: r.name || "Untitled", category: r.category || "Other", time: r.time || "",
      servings: r.servings || "", difficulty: r.difficulty || "", description: r.description || "",
      look: r.look || "", source: r.source || "", image: fix(r.image), finalImage: fix(r.finalImage),
      art: r.art || {}, ingredients: (r.ingredients || []).filter((i) => i && i.item), steps, origin,
    };
  }

  // Load the newest js/recipes.js from the website (only when this copy isn't the website itself)
  function fetchLatest() {
    if (!SITE || location.href.startsWith(SITE)) return Promise.resolve(null);
    return new Promise((resolve) => {
      const bundled = window.RECIPES, s = document.createElement("script");
      const done = (list) => { clearTimeout(timer); s.remove(); window.RECIPES = bundled; resolve(list); };
      const timer = setTimeout(() => done(null), 6000);
      s.onload = () => done(window.RECIPES !== bundled && Array.isArray(window.RECIPES) ? window.RECIPES : null);
      s.onerror = () => done(null);
      s.src = `${SITE}/js/recipes.js?t=${Date.now()}`;
      document.head.append(s);
    });
  }

  const toDataURL = (blob) => new Promise((res) => { if (!blob) return res(""); const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });

  async function load({ online = true } = {}) {
    const latest = online ? await fetchLatest() : null;
    updated = !!latest;
    const book = latest ? latest.map((r) => normalize(r, "book", SITE)) : (window.RECIPES || []).map((r) => normalize(r, "book"));
    local = read(LOCAL, []).map((r) => normalize(r, "local"));
    const seen = new Set();
    all = [...book, ...local].filter((r) => (seen.has(r.id) ? false : seen.add(r.id)));
    all.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    return all;
  }

  async function add(recipe, images = {}) {
    const r = { ...recipe, id: slug(recipe.name) + "-" + Date.now().toString(36), image: await toDataURL(images.image), finalImage: await toDataURL(images.finalImage) };
    const list = read(LOCAL, []);
    list.push(r);
    if (!write(LOCAL, list)) throw new Error("This device's storage is full. Try smaller pictures.");
    await load({ online: false });
    return r.id;
  }

  function removeLocal(id) { write(LOCAL, read(LOCAL, []).filter((r) => r.id !== id)); return load({ online: false }); }

  // Turns this device's recipes into text for js/recipes.js, plus picture files for the images/ folder
  function exportLocal() {
    const files = [];
    const recipes = read(LOCAL, []).map((r) => {
      const out = { ...r, id: slug(r.name) };
      for (const [key, suffix] of [["image", ""], ["finalImage", "-final"]]) {
        if (r[key] && r[key].startsWith("data:")) { const name = `${out.id}${suffix}.jpg`; files.push({ name, dataUrl: r[key] }); out[key] = "images/" + name; }
      }
      return out;
    });
    const text = "  // Paste these into the list in js/recipes.js (before the last ];)\n" +
      "  // and put the downloaded pictures in the images/ folder.\n" +
      recipes.map((r) => "  " + JSON.stringify(r, null, 2).replace(/\n/g, "\n  ") + ",").join("\n") + "\n";
    return { text, files };
  }

  return {
    load, add, removeLocal, exportLocal,
    get all() { return all; },
    get localCount() { return local.length; },
    get updatedFromWeb() { return updated; },
    get(id) { return all.find((r) => r.id === id); },
    categories() { return [...new Set(all.map((r) => r.category))].sort(); },
    search(q) {
      q = q.trim().toLowerCase();
      if (!q) return all;
      const words = q.split(/\s+/);
      return all
        .map((r) => {
          const hay = [r.name, r.category, r.description, ...r.ingredients.map((i) => i.item)].join(" ").toLowerCase();
          if (!words.every((w) => hay.includes(w))) return null;
          return { r, score: r.name.toLowerCase().startsWith(q) ? 0 : r.name.toLowerCase().includes(q) ? 1 : 2 };
        })
        .filter(Boolean).sort((a, b) => a.score - b.score).map((x) => x.r);
    },
  };
})();
