# Digital Cookbook

**▶ Open the cookbook: https://tylertrinh12803.github.io/digital-cook-book-app/**

A pixel-art cookbook that opens like a real book. Search or browse the glossary, then open a recipe to see its picture, ingredients (and where to find them), what it should look like, step-by-step instructions with an animated tutorial and timer, and the final product.

It's one small website that people can also install as an app:

| Way | How |
|---|---|
| **Website** | Hosted free on GitHub Pages. Anyone can open the link. |
| **Desktop app** | On the website, click **⬇ Install app** (top right). The cookbook gets its own icon on the desktop and Start menu, opens in its own window, and works offline. |
| **Download (.zip)** | For browsers that can't install apps. Unzip and double-click `cookbook/index.html`. |

Installed apps and downloaded copies get new recipes from the website automatically.

## Folder layout

```
cookbook/
  index.html, style.css     the page
  js/recipes.js             ← the built-in recipes (edit this to add your own)
  js/config.js              your website address + .zip download link
  js/app.js                 pages, search, glossary, timers
  js/book.js                plays your book animations (assets/)
  js/art.js                 pixel tutorial animations + dish pictures
  js/store.js               loads/saves recipes
  assets/                   your animation frames
  images/                   recipe photos
  manifest.webmanifest, sw.js   make it installable + work offline
```

There is no server to run and no `node_modules` folder to upload. The whole project is under 1 MB.

## Try it on your computer

Double-click `cookbook/index.html`. The **Install app** button only works once the site is online (GitHub Pages), because browsers only install apps from a website.

## Adding and updating recipes (no database needed)

All recipes live in one small file: **`cookbook/js/recipes.js`**. Photos go in **`cookbook/images/`**.

When you change them on GitHub:
- **Website:** shows the new recipes within a few minutes.
- **Installed app:** updates itself the same way.
- **Downloaded .zip copies:** load the newest recipes from the website each time they open, and use their built-in copy when there's no internet.

People never need to re-download anything to get new recipes. The app itself stays small because pictures load only when a recipe is opened.

**Easiest way, all in your web browser:**
1. On GitHub, open `cookbook/js/recipes.js` and click the ✏️ pencil.
2. Copy an existing recipe block, change it, and click **Commit changes**.
3. For photos, open the `cookbook/images` folder → **Add file → Upload files**. Then set `image: "images/your-photo.jpg"` (and `finalImage` for the finished dish) in the recipe. Leave them out and a pixel-art dish is drawn instead.

**Or use the app's form:** click **+ Add recipe** and save. It stays on your device. Then open the form again and click **Get publish files**. You get the recipe text to paste into `recipes.js` and the pictures to upload to `images/`.

**Keep photos small:** about 800 px wide JPGs, around 100 KB each. The form shrinks pictures automatically.

Each step's `action` picks its tutorial animation: `chop mix whisk stir boil fry flip bake pour season mash roll rest chill plate blend drain`. Its `timer` is in seconds.

## Putting it online (GitHub Pages)

The site is published straight from this repo: **Settings → Pages → Deploy from a branch → `main` / `(root)`**. Every change pushed to `main` goes live in about a minute.

- `index.html` at the top of the repo just forwards visitors to `cookbook/`, where the app lives.
- `js/config.js` → `siteUrl` must stay `https://tylertrinh12803.github.io/digital-cook-book-app/cookbook` (update it if the repo is renamed or moved).

## Old version

The first version used Electron and a MySQL database, which made the project too big to upload. This version is a plain website instead, with no server or database, and is under 1 MB.

**Security:** the old version's database password is still in some local copies of this project. If that AWS database still exists, delete it (it may also be costing you money) or change its password.

## Quality issue tracker

`quality-tracker/` is a separate FXN HT quality-issue tracker that runs only on your own computer
(http://localhost:8080). Start it with `start-windows.bat` or `sh start-mac-linux.sh`; see
[quality-tracker/README.md](quality-tracker/README.md). Tickets and uploaded reports are saved in
`quality-tracker/data/`, which git ignores, so no issue data is ever committed here.

## Incoming damage trend

`damage-tracker/` is a second, separate local app (http://localhost:8081) that charts the damaged
CP Rivet, CP TIM, CX8, Busbar, Tray and Paddle board units checked in per day from the Check-in
workbook. See [damage-tracker/README.md](damage-tracker/README.md). Its data folder is git-ignored too.

