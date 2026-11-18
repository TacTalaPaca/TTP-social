# Koinara

A text-first, local-only social demo by TacTalaPaca.

Koinara is a fast single-page app with four tabs: Feed, Explore, Chat, and Profile. It runs entirely in the browser, stores demo data on the device, and works offline after the first load.

- Live demo: https://tactalapaca.github.io/TTP-social/
- Repository: https://github.com/TacTalaPaca/TTP-social
- Version: 1.4
- License: PolyForm Noncommercial 1.0.0

## Features

- Plain HTML, CSS, and JavaScript. No build step.
- Works from `file://` and over HTTP.
- Light and dark themes.
- Local accounts, posts, replies, chats, follows, saves, and likes.
- Compressed WebP uploads with a full-screen crop editor.
- Up to five photos per post, with shared aspect ratio and per-photo pan and zoom.
- One-photo-per-swipe carousels.
- Mobile gestures, keyboard navigation, and installable PWA support.
- Fullscreen installed app that hides Android system bars.
- Offline shell and media cache.

## Run locally

Open `index.html` directly, or serve the folder:

```sh
python3 -m http.server 8137
```

Then open `http://localhost:8137/`.

Local development disables the service worker on `localhost`, `127.0.0.1`, `[::1]`, and `file://`. Add `?nosw` to any URL to disable it explicitly.

## Install

Koinara is a PWA. Install it from the browser menu, or use the Install app row in Settings. Installation requires HTTPS or localhost.

## Data

Demo data is local to the browser.

- `koinara.v1` stores app state.
- `koinara.ui.v1` stores tabs, scroll, search, layers, and drafts.
- IndexedDB `koinara-media` stores uploaded photos.

Reset the demo from Settings to return to the seed data.

## Publishing

The public repository is updated manually by the owner. Do not push or deploy changes unless the owner asks.

## License

PolyForm Noncommercial License 1.0.0. See `LICENSE`.

Required Notice: Copyright TacTalaPaca (https://github.com/TacTalaPaca)

## Credits

- Typeface: Atkinson Hyperlegible Next, SIL Open Font License 1.1. See `assets/fonts/OFL.txt`.
- Icons: Lucide, ISC License. See `assets/icons/LICENSE`.
- Demo photos are bundled for demonstration.
