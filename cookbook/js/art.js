/* Pixel-art drawings: animated cooking tutorials + dish pictures.
   Everything is drawn on a tiny 64x48 canvas and scaled up with crisp pixels,
   so it matches the cookbook sprites. */
const Art = (() => {
  const W = 64, H = 48;
  const C = {
    ink: "#3e222a", cream: "#f8e8ca", cream2: "#e1caa8", red: "#df6469", redD: "#974945",
    gold: "#f3c85d", goldD: "#c9952e", wood: "#b0744a", woodD: "#7a4a2e", steel: "#c8d4e6",
    steelD: "#8a9bb5", steelL: "#eef3fa", pan: "#4a4a58", panL: "#6c6c7e", fire: "#ff8c3a",
    fireL: "#ffd25a", water: "#7cc4e8", waterL: "#c4ecfa", white: "#fbf7ef", wall: "#f6e3c0",
    wallL: "#efd6ad", green: "#6ab04c", greenD: "#3f7a2e", steam: "#fffaf0", glass: "#d8eef6",
  };

  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  function pen(ctx) {
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const px = (x, y, c) => r(x, y, 1, 1, c);
    const box = (x, y, w, h, fill, out = C.ink) => { r(x, y, w, h, out); r(x + 1, y + 1, w - 2, h - 2, fill); };
    const ell = (cx, cy, rx, ry, c, half) => {
      for (let y = -ry; y <= ry; y++) {
        if (half === "bottom" && y < 0) continue;
        if (half === "top" && y > 0) continue;
        const e = ry + 0.5, hw = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (e * e))));
        r(cx - hw, cy + y, hw * 2 + 1, 1, c);
      }
    };
    const oell = (cx, cy, rx, ry, fill, half) => { ell(cx, cy, rx + 1, ry + 1, C.ink, half); ell(cx, cy, rx, ry, fill, half); };
    const line = (x0, y0, x1, y1, c, t = 1) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let e = dx + dy;
      for (;;) { r(x0, y0, t, t, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    };
    return { r, px, box, ell, oell, line };
  }

  /* ---------- shared scenery ---------- */
  function kitchen(p, tint) {
    p.r(0, 0, W, 36, tint || C.wall);
    for (let x = 0; x < W; x += 8) p.r(x, 0, 1, 36, C.wallL);
    for (let y = 8; y < 36; y += 8) p.r(0, y, W, 1, C.wallL);
    p.r(0, 36, W, 1, C.woodD);
    p.r(0, 37, W, 11, C.wood);
    p.r(0, 37, W, 1, "#c98c5c");
    for (let x = 5; x < W; x += 13) p.r(x, 40 + (x % 3), 4, 1, C.woodD);
  }
  function flames(p, cx, y, t, n = 4) {
    for (let i = 0; i < n; i++) {
      const x = cx - n * 2 + i * 4, h = 2 + Math.round(hash(i + Math.floor(t * 10)) * 2);
      p.r(x, y - h, 3, h, C.fire); p.r(x + 1, y - h + 1, 1, h - 1, C.fireL);
    }
  }
  function burner(p, cx, t) { p.r(cx - 12, 39, 24, 2, C.ink); flames(p, cx, 39, t, 5); }
  function steam(p, cx, top, t, n = 3, spread = 8) {
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.55 + i / n) % 1, y = top - ph * 14, x = cx - spread + i * spread + Math.sin(ph * 7 + i) * 2;
      const s = ph < 0.6 ? 2 : 1;
      p.r(x, y, s, s, C.steam); if (ph < 0.4) p.r(x + 1, y - 1, 1, 1, C.steam);
    }
  }
  function bowl(p, cx, cy, rx, fill, body = C.red) {
    p.oell(cx, cy, rx, Math.round(rx * 0.7), body, "bottom");
    p.r(cx - rx, cy + 2, rx * 2 + 1, 1, C.redD === body ? C.ink : shade(body));
    p.oell(cx, cy, rx, 3, C.ink);
    p.ell(cx, cy, rx - 1, 2, fill);
  }
  function pot(p, cx, top, fill) {
    p.box(cx - 17, top, 34, 16, C.steel);
    p.r(cx - 16, top + 1, 2, 14, C.steelL); p.r(cx + 12, top + 1, 3, 14, C.steelD);
    p.box(cx - 21, top + 3, 5, 3, C.steelD); p.box(cx + 16, top + 3, 5, 3, C.steelD);
    p.oell(cx, top, 16, 3, C.steelD); p.ell(cx, top + 1, 14, 2, fill);
  }
  function pan(p, x, y, w = 34, lift = 0) {
    p.box(x, y - lift, w, 5, C.pan); p.r(x + 1, y + 1 - lift, w - 2, 1, C.panL);
    p.box(x + w - 1, y + 1 - lift, 15, 3, C.woodD);
  }
  function plate(p, cx, cy, rx = 20) { p.oell(cx, cy, rx, 5, C.white); p.ell(cx, cy, rx - 5, 3, "#f1eadb"); }
  function shade(hex, k = 0.72) {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, "0");
    return "#" + f(n >> 16) + f((n >> 8) & 255) + f(n & 255);
  }
  function light(hex) { return shade(hex, 1.18); }

  /* ---------- tutorial animations ---------- */
  const ACTIONS = {
    chop(p, t, k) {
      kitchen(p);
      p.box(6, 33, 52, 7, C.wood); p.r(7, 34, 50, 1, "#d39a6a");
      const n = Math.floor(t * 2) % 7;
      for (let i = 0; i < n; i++) { p.box(9 + i * 3, 27, 3, 6, k.food); }
      const vx = 12 + n * 3;
      p.box(vx, 26, Math.max(4, 40 - n * 3), 7, k.food); p.r(vx + 1, 27, Math.max(2, 38 - n * 3), 1, light(k.food));
      p.r(vx + Math.max(4, 40 - n * 3) - 2, 24, 2, 3, C.green);
      const down = (t * 4) % 1 < 0.5, ky = down ? 21 : 12;
      p.box(vx - 13, ky, 17, 5, C.steel); p.r(vx - 12, ky + 3, 15, 1, C.steelL);
      p.box(vx + 3, ky + 1, 10, 3, C.woodD);
      if (down) { p.px(vx - 2, 31, C.steam); p.px(vx + 1, 30, C.steam); }
    },
    mix(p, t, k) {
      kitchen(p);
      bowl(p, 32, 25, 19, k.food);
      const a = t * 5;
      for (let i = 0; i < 4; i++) { const b = a + i * 1.6; p.r(32 + Math.cos(b) * (5 + i * 3), 25 + Math.sin(b) * 1.5, 2, 1, k.accent); }
      const sx = 32 + Math.cos(a) * 9, sy = 25 + Math.sin(a) * 1.5;
      p.line(sx, sy, sx + 8, 4, C.ink, 3); p.line(sx + 1, sy, sx + 9, 4, C.wood, 1);
    },
    whisk(p, t, k) {
      kitchen(p);
      bowl(p, 32, 25, 19, k.food);
      const x = 32 + Math.sin(t * 13) * 8;
      p.r(x - 1, 2, 3, 12, C.ink); p.r(x, 3, 1, 10, C.woodD);
      for (let i = -1; i <= 1; i++) { p.line(x, 14, x + i * 4, 21, C.steelD); p.line(x + i * 4, 21, x, 26, C.steelD); }
      if ((t * 6) % 1 < 0.3) { p.px(x - 6, 19, k.food); p.px(x + 7, 18, k.food); }
    },
    stir(p, t, k) {
      kitchen(p); burner(p, 32, t);
      pot(p, 32, 23, k.food);
      const a = t * 4, sx = 32 + Math.cos(a) * 9, sy = 24 + Math.sin(a) * 1.2;
      p.line(sx, sy, sx + 10, 3, C.ink, 3); p.line(sx + 1, sy, sx + 11, 3, C.wood);
      steam(p, 30, 19, t);
    },
    boil(p, t, k) {
      kitchen(p); burner(p, 32, t);
      pot(p, 32, 23, k.liquid || C.water);
      for (let i = 0; i < 7; i++) {
        const ph = (t * 1.3 + hash(i)) % 1, x = 19 + hash(i + 9) * 26;
        if (ph > 0.8) { p.px(x, 22, C.waterL); p.px(x + 2, 21, C.waterL); }
        else p.r(x, 24, 2, 1, C.waterL);
      }
      steam(p, 32, 20, t, 4, 7); steam(p, 28, 16, t + 0.5, 3, 9);
    },
    fry(p, t, k) {
      kitchen(p); burner(p, 28, t);
      pan(p, 10, 33);
      for (let i = 0; i < 4; i++) {
        const j = Math.abs(Math.sin(t * 6 + i * 1.7)) * 5;
        p.box(12 + i * 7, 29 - j, 7, 4, k.food); p.r(13 + i * 7, 30 - j, 4, 1, light(k.food));
      }
      for (let i = 0; i < 6; i++) {
        if (hash(i + Math.floor(t * 12)) > 0.55) p.px(12 + hash(i * 3 + Math.floor(t * 12)) * 30, 24 + hash(i) * 6, i % 2 ? C.fireL : C.steam);
      }
    },
    flip(p, t, k) {
      kitchen(p); burner(p, 28, t);
      const ph = (t % 1.6) / 1.6;
      pan(p, 10, 33, 34, ph < 0.08 ? 2 : 0);
      if (ph < 0.62) {
        const q = ph / 0.62, y = 29 - Math.sin(q * Math.PI) * 22, ang = q * Math.PI;
        const h = Math.max(1, Math.round(Math.abs(Math.cos(ang)) * 4)), top = Math.cos(ang) > 0;
        p.oell(27, y, 9, h, top ? k.food : light(k.food));
      } else { p.oell(27, 30, 9, 1, k.food); p.px(24, 29, light(k.food)); }
    },
    bake(p, t, k) {
      kitchen(p);
      p.box(12, 4, 40, 40, "#dfe3ea"); p.r(13, 5, 38, 7, "#c4c9d4");
      for (let i = 0; i < 3; i++) { p.box(16 + i * 7, 6, 5, 5, C.steel); p.px(18 + i * 7, 7, C.ink); }
      p.box(44, 7, 4, 3, Math.floor(t * 2) % 2 ? C.red : C.redD);
      p.r(17, 14, 30, 2, C.ink);
      const glow = Math.sin(t * 3) > 0 ? "#ffb066" : "#ff9a4a";
      p.box(16, 17, 32, 22, "#2b2230"); p.r(17, 18, 30, 20, glow);
      p.r(18, 34, 28, 1, C.ink);
      const rise = 3 + Math.round((Math.sin(t * 1.2) + 1));
      p.oell(32, 33, 10, rise, k.food, "top");
      for (let i = 0; i < 3; i++) { const y = 31 - ((t * 10 + i * 6) % 12); p.px(22 + i * 9 + (Math.floor(y) % 2), y, "#ffd8a8"); }
    },
    pour(p, t, k) {
      kitchen(p);
      bowl(p, 36, 32, 17, k.food);
      for (let r = 0; r < 12; r++) p.r(8 + Math.round(r * 0.8), 4 + r, 13, 1, r === 0 || r === 11 ? C.ink : C.glass);
      p.r(8, 4, 1, 1, C.ink);
      for (let r = 3; r < 11; r++) p.r(10 + Math.round(r * 0.8), 4 + r, 10, 1, k.liquid || k.food);
      p.r(22, 15, 3, 2, k.liquid || k.food);
      for (let y = 17; y < 31; y++) p.r(24 + ((Math.floor(t * 12) + y) % 5 === 0 ? 1 : 0), y, 2, 1, k.liquid || k.food);
      const rip = 3 + ((t * 6) % 4);
      p.ell(25, 32, Math.round(rip), 1, light(k.liquid || k.food));
    },
    season(p, t, k) {
      kitchen(p);
      plate(p, 32, 36); p.oell(32, 33, 11, 4, k.food, "top");
      const j = Math.sin(t * 22) * 2;
      p.box(28 + j, 3, 9, 13, C.white); p.box(28 + j, 3, 9, 4, C.steel);
      p.px(30 + j, 5, C.ink); p.px(33 + j, 5, C.ink);
      for (let i = 0; i < 14; i++) {
        const ph = (t * 1.6 + hash(i)) % 1;
        p.px(32 + (hash(i + 3) - 0.5) * 12 + j * ph, 17 + ph * 14, i % 3 ? "#5a4a42" : C.white);
      }
    },
    mash(p, t, k) {
      kitchen(p);
      bowl(p, 32, 25, 19, k.food);
      for (let i = 0; i < 5; i++) p.r(20 + i * 5, 24 + (i % 2), 3, 2, shade(k.food, 0.85));
      const d = Math.abs(Math.sin(t * 5)) * 7, y = 9 + d;
      p.r(31, 0, 3, y + 1, C.ink); p.r(32, 0, 1, y, C.woodD);
      p.r(25, y + 1, 15, 2, C.ink); p.r(26, y + 1, 13, 1, C.steel);
      if (d > 6) { p.px(22, 20, k.food); p.px(43, 19, k.food); }
    },
    roll(p, t, k) {
      kitchen(p);
      const s = (t * 0.4) % 1, w = 10 + Math.round(s * 12), h = Math.max(2, 5 - Math.round(s * 3));
      p.oell(32, 34, w, h, k.food, "top"); p.r(32 - w, 34, w * 2 + 1, 1, C.ink);
      const x = 32 + Math.sin(t * 3) * (w - 4), y = 34 - h - 5;
      p.box(x - 10, y, 20, 5, C.wood); p.r(x - 9, y + 1, 18, 1, "#d39a6a");
      p.box(x - 15, y + 1, 6, 3, C.woodD); p.box(x + 9, y + 1, 6, 3, C.woodD);
    },
    rest(p, t, k) {
      kitchen(p);
      plate(p, 32, 38); p.oell(32, 35, 11, 4, k.food, "top");
      p.oell(32, 14, 9, 9, C.white);
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; p.px(32 + Math.cos(a) * 7, 14 + Math.sin(a) * 7, C.ink); }
      const a = t * 1.5 - Math.PI / 2; p.line(32, 14, 32 + Math.cos(a) * 6, 14 + Math.sin(a) * 6, C.red);
      p.line(32, 14, 32, 9, C.ink); p.px(32, 14, C.ink);
      steam(p, 32, 29, t, 3, 6);
    },
    chill(p, t, k) {
      kitchen(p, "#dfeef6");
      plate(p, 32, 38); p.oell(32, 35, 11, 4, k.food, "top");
      for (let i = 0; i < 9; i++) {
        const ph = (t * 0.35 + hash(i)) % 1, x = 6 + hash(i + 4) * 52, y = ph * 34;
        p.px(x, y, C.white); p.px(x - 1, y, C.waterL); p.px(x + 1, y, C.waterL); p.px(x, y - 1, C.waterL); p.px(x, y + 1, C.waterL);
      }
    },
    plate(p, t, k) {
      kitchen(p);
      plate(p, 32, 37, 21);
      const ph = (t % 2.6) / 2.6, drop = ph < 0.25 ? (1 - ph / 0.25) * 26 : 0;
      p.oell(32, 33 - drop, 12, 5, k.food, "top"); p.r(26, 31 - drop, 4, 1, light(k.food));
      p.px(30, 28 - drop, k.accent); p.px(34, 29 - drop, k.accent); p.px(36, 30 - drop, C.green);
      if (ph > 0.3) for (let i = 0; i < 4; i++) {
        if ((Math.floor(t * 6) + i) % 3) continue;
        const x = 12 + hash(i + Math.floor(t)) * 40, y = 8 + hash(i * 2 + Math.floor(t)) * 18;
        p.px(x, y, C.gold); p.px(x - 1, y, C.goldD); p.px(x + 1, y, C.goldD); p.px(x, y - 1, C.goldD); p.px(x, y + 1, C.goldD);
      }
    },
    blend(p, t, k) {
      kitchen(p);
      const j = Math.floor(t * 20) % 2;
      p.box(23 + j, 34, 18, 9, C.red); p.box(30 + j, 37, 4, 3, C.gold);
      for (let y = 8; y < 34; y++) { const hw = 7 + Math.round((y - 8) * 0.08); p.r(32 - hw - 1 + j, y, hw * 2 + 3, 1, C.ink); p.r(32 - hw + j, y, hw * 2 + 1, 1, y > 16 ? (k.liquid || k.food) : C.glass); }
      for (let y = 17; y < 33; y++) if ((y + Math.floor(t * 14)) % 4 === 0) p.r(27 + ((y * 3) % 9) + j, y, 3, 1, light(k.liquid || k.food));
      p.box(23 + j, 5, 18, 4, C.ink);
    },
    drain(p, t, k) {
      kitchen(p);
      p.box(8, 38, 48, 6, C.steelD);
      p.oell(32, 22, 16, 11, C.steel, "bottom"); p.oell(32, 22, 16, 3, C.ink); p.ell(32, 22, 15, 2, k.food);
      for (let i = 0; i < 4; i++) p.r(20 + i * 7, 23, 4, 1, shade(k.food, 0.85));
      for (let i = 0; i < 6; i++) p.px(22 + i * 4, 28 + (i % 2) * 2, C.ink);
      for (let i = 0; i < 6; i++) { const ph = (t * 2 + hash(i)) % 1; p.r(22 + i * 4, 31 + ph * 7, 1, 2, C.water); }
      steam(p, 32, 16, t, 3, 7);
    },
  };
  const ALIASES = {
    combine: "mix", fold: "mix", cream: "mix", toss: "mix", beat: "whisk", simmer: "stir", heat: "stir",
    saute: "fry", sear: "fry", toast: "fry", melt: "fry", grill: "fry", cook: "fry", scramble: "fry",
    preheat: "bake", roast: "bake", slice: "chop", dice: "chop", mince: "chop", cut: "chop", peel: "chop",
    sprinkle: "season", salt: "season", garnish: "season", cool: "rest", wait: "rest",
    freeze: "chill", refrigerate: "chill", knead: "roll", shape: "roll", scoop: "roll", smash: "mash",
    puree: "blend", strain: "drain", serve: "plate",
  };
  const ACTION_NAMES = Object.keys(ACTIONS);
  function resolve(action) { const a = String(action || "").toLowerCase().trim(); return ACTIONS[a] ? a : ALIASES[a] || "mix"; }

  /* ---------- dish pictures (used when a recipe has no photo) ---------- */
  function drawDish(p, art, t = 0, final = false) {
    const k = colors(art);
    p.r(0, 0, W, H, "#fbeed6");
    for (let y = 0; y < H; y += 6) for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) p.r(x, y, 6, 6, "#f6dcc4");
    const d = art.dish || "plate";
    if (d === "bowl" || d === "soup") {
      p.oell(32, 26, 21, 15, C.white, "bottom"); p.r(12, 30, 41, 1, "#e6dccb");
      p.oell(32, 26, 21, 4, C.ink); p.ell(32, 26, 20, 3, k.food);
      p.r(22, 25, 3, 1, light(k.food)); p.px(36, 26, k.accent); p.px(30, 27, k.accent); p.r(40, 25, 2, 1, C.green);
      steam(p, 32, 20, t, 3, 7);
    } else if (d === "stack") {
      plate(p, 32, 38, 22);
      for (let i = 0; i < 4; i++) { p.oell(32, 34 - i * 4, 14, 3, i % 2 ? k.food : shade(k.food, 0.92)); }
      p.box(29, 18, 7, 3, "#fff1a8"); p.r(22, 23, 2, 6, k.accent); p.r(41, 22, 2, 8, k.accent); p.r(30, 21, 6, 1, k.accent);
    } else if (d === "cookies") {
      p.box(6, 30, 52, 10, C.steelD);
      for (let i = 0; i < 3; i++) { const x = 16 + i * 16, y = 27 + (i % 2) * 3; p.oell(x, y, 7, 4, k.food); p.px(x - 2, y - 1, k.accent); p.px(x + 2, y, k.accent); p.px(x, y + 2, k.accent); p.px(x + 3, y - 2, k.accent); }
    } else if (d === "glass" || d === "drink") {
      for (let y = 8; y < 42; y++) { const hw = 8 - Math.round((y - 8) * 0.06); p.r(32 - hw - 1, y, hw * 2 + 3, 1, C.ink); p.r(32 - hw, y, hw * 2 + 1, 1, y > 12 ? k.food : C.glass); }
      p.r(26, 14, 2, 26, light(k.food)); p.line(36, 12, 43, 2, C.red, 2); p.oell(25, 10, 4, 3, k.accent);
    } else if (d === "pasta") {
      plate(p, 32, 35, 23);
      p.oell(32, 33, 14, 7, k.food, "top"); p.r(18, 33, 29, 1, C.ink);
      for (let i = 0; i < 4; i++) for (let x = 20; x < 45; x += 1) { const y = 28 + i * 1.6 + Math.round(Math.sin(x * 0.9 + i * 2.2)); if (Math.abs(x - 32) < 13 - i) p.px(x, y, shade(k.food, 0.82)); }
      p.r(29, 27, 3, 2, k.accent); p.r(35, 29, 2, 2, k.accent); p.r(31, 26, 2, 1, C.green); p.px(38, 28, C.green); p.px(25, 30, C.green);
    } else if (d === "pot") {
      p.r(0, 37, W, 11, C.wood); pot(p, 32, 22, k.food); steam(p, 32, 18, t, 4, 7);
    } else {
      plate(p, 32, 34, 23);
      p.oell(32, 30, 13, 6, k.food, "top"); p.r(32 - 13, 30, 27, 1, shade(k.food));
      p.r(25, 26, 5, 1, light(k.food)); p.px(28, 28, k.accent); p.px(36, 27, k.accent); p.px(33, 25, C.green); p.px(39, 29, C.green);
    }
    if (final) for (let i = 0; i < 3; i++) {
      if ((Math.floor(t * 5) + i) % 3) continue;
      const x = 8 + hash(i + Math.floor(t * 1.5)) * 48, y = 4 + hash(i + 7 + Math.floor(t * 1.5)) * 18;
      p.px(x, y, C.gold); p.px(x - 1, y, C.goldD); p.px(x + 1, y, C.goldD); p.px(x, y - 1, C.goldD); p.px(x, y + 1, C.goldD);
    }
  }
  function colors(art = {}) {
    return { food: art.food || "#e3a857", accent: art.accent || "#8a4b22", liquid: art.liquid };
  }

  /* ---------- canvas animation loop (one per canvas) ---------- */
  const loops = new Map();
  function animate(canvas, draw) {
    stop(canvas);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d"), p = pen(ctx), t0 = performance.now();
    let last = -1;
    const tick = (now) => {
      if (!canvas.isConnected) { loops.delete(canvas); return; }
      const t = (now - t0) / 1000, f = Math.floor(t * 12);
      if (f !== last) { last = f; ctx.clearRect(0, 0, W, H); draw(p, f / 12); }
      loops.set(canvas, requestAnimationFrame(tick));
    };
    loops.set(canvas, requestAnimationFrame(tick));
  }
  function stop(canvas) { const id = loops.get(canvas); if (id) cancelAnimationFrame(id); loops.delete(canvas); }

  return {
    ACTION_NAMES,
    resolve,
    tutorial(canvas, action, art) { const a = resolve(action), k = colors(art); animate(canvas, (p, t) => ACTIONS[a](p, t, k)); return a; },
    dish(canvas, art = {}, opts = {}) {
      if (opts.animate) return animate(canvas, (p, t) => drawDish(p, art, t, opts.final));
      canvas.width = W; canvas.height = H; drawDish(pen(canvas.getContext("2d")), art, 0, false);
    },
  };
})();
