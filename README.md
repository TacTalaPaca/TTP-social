# Koinara

A text-first, local-only social demo by TacTalaPaca.

Koinara is a fast single-page app with four tabs: Feed, Explore, Chat, and Profile. It runs entirely in the browser, stores demo data on the device, and works offline after the first load.

- Live demo: https://tactalapaca.github.io/TTP-social/
- Repository: https://github.com/TacTalaPaca/TTP-social
- Version: 1.10
- License: PolyForm Noncommercial 1.0.0

## Features

- Plain HTML, CSS, and JavaScript. No build step.
- Works from `file://` and over HTTP.
- Light and dark themes.
- Local accounts, posts, threaded comments, chats, follows, saves, and likes.
- A larger local demo database: 28 accounts, 121 posts, and 339 comments.
- Curated Explore with trending tags, suggested people, a ranked discover feed, and recent photos.
- Search by text, #tag, or @handle with ranked, paginated results.
- Locally compressed AVIF uploads with a full-screen crop editor. Crops are baked into new AVIF files on publish and Save.
- Up to five photos per post, with shared aspect ratio and per-photo pan and zoom.
- One-photo-per-swipe carousels.
- Pinch-to-zoom on post photos with elastic return.
- Profile photos open in a zoomable lightbox with a tap-anywhere close.
- Mobile gestures, keyboard navigation, and installable PWA support.
- Native-like on-screen keyboard handling for comment, chat, and compose bars on Android and iOS.
- Standalone installed app with a neutral launch surface; browser system UI follows the theme.
- Cross-platform icons, including maskable and monochrome Android variants and an Apple touch icon.
- Tap-to-reply threads with expand, collapse, and show more, comment likes with counts, and press-and-hold delete for your own comments.
- Exact unread count pills in chat rows, including a 137-message conversation.
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

Chrome's installed shortcut carries a small Chrome badge. Removing it requires a packaged Trusted Web Activity.

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
- AVIF encoder: `@saschazar/wasm-avif`, MIT License. See `assets/avif/LICENSE`.
- Brand mark and app icon: TacTalaPaca.
- Demo photos are bundled for demonstration. Seed photos p19 to p38 are from Unsplash contributors via Lorem Picsum. See `assets/img/CREDITS.md`.
