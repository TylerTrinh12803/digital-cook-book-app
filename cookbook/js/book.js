/* The book sprite: preloads your animation frames and plays them on a canvas. */
const Book = (() => {
  const W = 85, H = 99, VIEW_TOP = 28; // the top of each frame is empty sky, so we crop it
  const SEQ = {
    intro: [0, 6], next: [1, 8], nextgloss: [1, 5], glossary: [1, 13],
    recipe: [1, 8], nextrecipe: [1, 17], markfold: [1, 9], end: [1, 8],
  };
  // Resting poses and which frame shows them
  const POSE = { closed: ["intro", 0], cover: ["intro", 6], plain: ["next", 8], ribbon: ["recipe", 8], back: ["end", 8] };
  // Writable page areas for each pose, in sprite pixels (x, y, w, h)
  const PAGES = {
    closed: { L: [3, 55, 36, 34], R: null },
    cover: { L: [5, 53, 32, 36], R: [46, 53, 33, 36] },
    plain: { L: [6, 53, 29, 36], R: [50, 53, 29, 36] },
    ribbon: { L: [6, 53, 29, 36], R: [54, 53, 25, 36] },
    back: { L: [5, 53, 34, 35], R: [47, 53, 32, 37] },
  };
  const img = {};
  let canvas, ctx;
  const src = (s, i) => `assets/${s}/${s}${i}.png`;

  function init(c) { canvas = c; canvas.width = W; canvas.height = H; ctx = canvas.getContext("2d"); ctx.imageSmoothingEnabled = false; }

  function preload(onProgress) {
    const list = [];
    for (const [s, [a, b]] of Object.entries(SEQ)) for (let i = a; i <= b; i++) list.push([s, i]);
    let done = 0;
    return Promise.all(list.map(([s, i]) => new Promise((res) => {
      const im = new Image();
      im.onload = im.onerror = () => { done++; onProgress && onProgress(done / list.length); res(); };
      im.src = src(s, i);
      img[s + i] = im;
    })));
  }

  function draw(s, i) { const im = img[s + i]; ctx.clearRect(0, 0, W, H); if (im && im.complete) ctx.drawImage(im, 0, 0); }
  function setPose(name) { const [s, i] = POSE[name]; draw(s, i); }

  function play(s, { reverse = false, fps = 13 } = {}) {
    const [a, b] = SEQ[s];
    const frames = []; for (let i = a; i <= b; i++) frames.push(i);
    if (reverse) frames.reverse();
    return new Promise((res) => {
      let k = 0;
      const step = () => { draw(s, frames[k]); k++; if (k < frames.length) setTimeout(step, 1000 / fps); else setTimeout(res, 1000 / fps); };
      step();
    });
  }

  return { W, H, VIEW_TOP, VIEW_H: H - VIEW_TOP, PAGES, init, preload, play, setPose, draw };
})();
