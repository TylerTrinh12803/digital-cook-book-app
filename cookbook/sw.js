/* Offline support for the website version: saves the app on first visit. */
const CACHE = "cookbook-v2";
const FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "js/app.js",
  "js/art.js",
  "js/book.js",
  "js/config.js",
  "js/recipes.js",
  "js/store.js",
  "icons/favicon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "assets/end/end1.png",
  "assets/end/end2.png",
  "assets/end/end3.png",
  "assets/end/end4.png",
  "assets/end/end5.png",
  "assets/end/end6.png",
  "assets/end/end7.png",
  "assets/end/end8.png",
  "assets/glossary/glossary1.png",
  "assets/glossary/glossary10.png",
  "assets/glossary/glossary11.png",
  "assets/glossary/glossary12.png",
  "assets/glossary/glossary13.png",
  "assets/glossary/glossary2.png",
  "assets/glossary/glossary3.png",
  "assets/glossary/glossary4.png",
  "assets/glossary/glossary5.png",
  "assets/glossary/glossary6.png",
  "assets/glossary/glossary7.png",
  "assets/glossary/glossary8.png",
  "assets/glossary/glossary9.png",
  "assets/intro/intro0.png",
  "assets/intro/intro1.png",
  "assets/intro/intro2.png",
  "assets/intro/intro3.png",
  "assets/intro/intro4.png",
  "assets/intro/intro5.png",
  "assets/intro/intro6.png",
  "assets/markfold/markfold1.png",
  "assets/markfold/markfold2.png",
  "assets/markfold/markfold3.png",
  "assets/markfold/markfold4.png",
  "assets/markfold/markfold5.png",
  "assets/markfold/markfold6.png",
  "assets/markfold/markfold7.png",
  "assets/markfold/markfold8.png",
  "assets/markfold/markfold9.png",
  "assets/next/next1.png",
  "assets/next/next2.png",
  "assets/next/next3.png",
  "assets/next/next4.png",
  "assets/next/next5.png",
  "assets/next/next6.png",
  "assets/next/next7.png",
  "assets/next/next8.png",
  "assets/nextgloss/nextgloss1.png",
  "assets/nextgloss/nextgloss2.png",
  "assets/nextgloss/nextgloss3.png",
  "assets/nextgloss/nextgloss4.png",
  "assets/nextgloss/nextgloss5.png",
  "assets/nextrecipe/nextrecipe1.png",
  "assets/nextrecipe/nextrecipe10.png",
  "assets/nextrecipe/nextrecipe11.png",
  "assets/nextrecipe/nextrecipe12.png",
  "assets/nextrecipe/nextrecipe13.png",
  "assets/nextrecipe/nextrecipe14.png",
  "assets/nextrecipe/nextrecipe15.png",
  "assets/nextrecipe/nextrecipe16.png",
  "assets/nextrecipe/nextrecipe17.png",
  "assets/nextrecipe/nextrecipe2.png",
  "assets/nextrecipe/nextrecipe3.png",
  "assets/nextrecipe/nextrecipe4.png",
  "assets/nextrecipe/nextrecipe5.png",
  "assets/nextrecipe/nextrecipe6.png",
  "assets/nextrecipe/nextrecipe7.png",
  "assets/nextrecipe/nextrecipe8.png",
  "assets/nextrecipe/nextrecipe9.png",
  "assets/recipe/recipe1.png",
  "assets/recipe/recipe2.png",
  "assets/recipe/recipe3.png",
  "assets/recipe/recipe4.png",
  "assets/recipe/recipe5.png",
  "assets/recipe/recipe6.png",
  "assets/recipe/recipe7.png",
  "assets/recipe/recipe8.png"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // Network first (so updates show up), fall back to the saved copy when offline
  e.respondWith(
    fetch(e.request)
      .then((res) => { if (res.ok && (url.origin === location.origin || url.hostname.includes("fonts."))) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); } return res; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
