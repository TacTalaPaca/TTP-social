# AGENTS.md

This file is the source of truth for work on Koinara. Read it before changing code.

## Product

Koinara is a fast, text-first, local-only social demo by TacTalaPaca. It is a single-page app with four tabs: Feed, Explore, Chat, and Profile. It has no backend, no account system, and no network dependency after the first load.

## Non-negotiable platform rules

- Use plain HTML, CSS, and JavaScript. No framework, bundler, transpiler, or build step.
- Do not load runtime code, fonts, icons, or styles from a CDN.
- The app must work from `file://` as well as over HTTP.
- Load scripts as classic scripts with `defer`. Do not convert the app to ES modules.
- Keep the app usable offline. The service worker caches the shell and images.
- Keep the demo local. Any credentials work. Data lives on the device.
- Do not add a server, database, analytics, tracking, or remote API.

## Performance

- Target the display refresh rate. Every interaction must feel native and immediate.
- Animate only `transform` and `opacity` on the compositor.
- Never read layout in a pointer or scroll handler after writing styles. Cache measurements at gesture start.
- Batch gesture writes with `requestAnimationFrame`.
- Do not animate width, height, top, left, margin, box-shadow, filter, or background-color during a gesture.
- Avoid permanent `will-change`. Add it only while an element is actually animating, then remove it.
- Do not add loading spinners, skeletons, or artificial delays.
- Keep scroll positions stable across refresh and re-render. Use `overflow-anchor: none` and preserve scroll when replacing lists.
- Use the shared `--ease` curve for page, layer, compose, and carousel motion so transitions flow consistently.
- Keep the DOM small. Do not re-render a whole view during a transition.
- Respect `prefers-reduced-motion`.
- Avoid effects that force a full repaint, such as backdrop filters or large blurred shadows.
- Test at 320, 360, 390, 430, 900, 1024, and 1440 pixels wide.

## Visual language

- Monochrome, calm, and minimal. Use the existing light and dark tokens.
- Typeface: Atkinson Hyperlegible Next, bundled locally.
- Icons: the bundled Lucide subset, stroke width 2.25. Do not add a second icon set.
- The brand mark is the custom filled K with square cuts and a diagonal split. Use the same path in `mark.svg` and the icon sources; do not redraw it. The sidebar uses the text wordmark only.
- The mobile unread dot sits at the optical center of the chat bubble, not the center of the icon box.
- The app icon sources are the normal, maskable, and monochrome SVGs in `assets/icons`. Commit the PNG exports so Android, iOS, and PWABuilder can use them. Keep the maskable mark inside the central 80% safe circle with a full-bleed background. Do not use transparency for the normal or Apple icons.
- The sidebar brand is a centered two-line lockup. The wordmark and byline share the same width.
- Avatars, post photos, grids, and the brand mark use the same corner radius as buttons and panels. Do not give avatars or logos their own circular or percentage radius.
- Keep margins equal and spacing consistent. Use the `--gutter` token.
- Use one shared corner radius from `--r` on straight elements. Pills are reserved for the tab bar and mobile tabs.
- Do not add page-title bars. Headers belong to layers only.
- Keep the branding small: `koinara` and `by TacTalaPaca`.
- Do not restore the removed tagline.
- The login screen has no cover image. It uses the dark rounded-square tile with the light K and the ring. Keep that tile dark in both themes.
- The settings gear belongs in the profile header next to Edit.
- The desktop layout uses a left sidebar and one middle column. There is no right rail.
- The mobile layout uses a floating tab bar and a distinct touch experience.
- The mobile feed has no top bar. New post lives as a quiet square button in the center of the tab bar.
- The sidebar wordmark is static, not a link. Keep the wordmark and byline centered and equal in width.
- Desktop sidebar tabs use a subtle border and 9px vertical gaps.
- Mobile tab selection uses one short shared fade for icon, label, and background. Do not stagger them or animate the icon separately.
- Profile tab changes animate only the list below the tabs, with a 300ms fade and a 16px lift. Never move or fade the profile header or the tabs.
- Keep browser and password-manager autofill buttons out of search, comment, and profile fields.
- Hover effects only on devices that can hover. Use the 120ms shared easing for hover transitions. Touch devices get active feedback on navigation controls. Post action icons (like, reply, save, share) never change color or opacity on press, and icon-only actions never get hover styling on touch.
- Scope hover rules with `@media (any-hover: hover)` instead of undoing them with a touch reset.
- The Chromium scrollbar is a thin overlay that takes no layout space. Firefox keeps its native thin scrollbar.
- Keep one manifest in standalone mode. Do not set manifest `theme_color`. Set `background_color` to the neutral launch surface only.
- Never add a single static `theme-color` fallback. It can override the dynamic meta and defeat the theme sync.
- Keep two `theme-color` metas scoped by `prefers-color-scheme`. For a manual theme, force one with `media="all"` and disable the other with `media="not all"`. The browser chooses the runtime color. Match it to the bottom edge surface, and keep the `color-scheme` meta and root color scheme in sync.
- A single manifest cannot follow the in-app theme. Accept that the installed system bar may be fixed at install time. Where a surface cannot be dynamic, use the neutral launch color instead of a theme fallback.
- Android Chrome PWAs cannot make the system navigation bar transparent. Keep the safe-area bottom padding so gesture or transparent bars never overlap content.
- The Chrome WebAPK badge on an installed icon is platform-controlled. Do not promise to remove it from the manifest; only a packaged TWA can do that.
- First and last rows in every list get a divider. Dividers stay quiet and consistent.

## Navigation and layers

- Layers open inside the middle column on desktop.
- Chat, post, profile, people, settings, collections, compose, crop, and edit are layers.
- Switching tabs closes layers.
- Back and Forward must work on every page and in every flow.
- Use navigation snapshots. Each history entry stores tab, layer stack, scroll positions, search text, profile tab, and drafts.
- Push a history entry for a tab change or a layer open. Replace the current entry for scroll, search, and draft updates.
- Rebuild history entries on refresh when layers were restored.
- Closing a layer with the interface uses `history.back()`.
- Tapping the active tab closes its layers and consumes that flow so Back does not reopen it.
- Do not use `history.go(-depth)` to simulate navigation.
- Do not trap the user in a layer.
- Browser Back and system Back are the source of truth on mobile. Do not add a custom edge-swipe that can double-fire with the native gesture.

## Feed, Explore, and people

- Feed shows only posts from the current user and followed users.
- Explore shows every post, plus people, tags, and photos.
- Followers and Following counts open searchable people lists.
- The current user follows only a subset of the seeded people.
- Explore photos are deduplicated. Never show the same photo twice in the photo grid.
- Multi-photo posts use carousels, not collages.
- At least one seed post has five photos.
- A post can have at most five photos.

## Posts

- A post is text, or text plus photos.
- Clicking the post body or photo must not open the comments layer.
- The comments button is the only post action that opens the post detail.
- Double-tap a post to like it. Double-tap never unlikes. If the post is already liked, replay the heart animation without changing state.
- Keyboard `Enter` or `O` opens the focused post.
- Action order is Like, Reply, Save, Share.
- Action icons are large and clearly defined. Do not put pill or rounded backgrounds behind them.
- Do not scale the like or save icon.
- Do not add a background-color transition to the like or save buttons. Do not add a pressed color or opacity change to Like, Reply, Save, or Share on touch.
- Like uses a clipped radial wave across the post, a hairline ring above the side panel, and a centered heart on the photo.
- Save uses the same expanding hairline ring as Like, centered on the bookmark.
- Media hearts use black or white based on the image luminance. Do not add a stroke or border.
- Keep the photo frame aspect ratio shared by every photo in a post.
- On mobile, post media and photo grids are full-bleed. Text and actions keep the normal gutter.
- Carousel dots sit below the media, never over the photo.
- Do not add carousel arrow buttons. Swipe, mouse drag, dots, and keyboard arrows are the controls.
- Mouse drag must capture the pointer and release it on pointerup, pointercancel, or lost capture.
- Pinch zoom uses a temporary overlay. Hide the source photo, anchor the zoom at the pinch point, keep the image above the app, and spring back when the gesture ends.
- Page pinch zoom is disabled on mobile so the photo owns the gesture.

## Photos and the composer

- Compress uploads to WebP before storing them.
- Seed photos are AVIF and bundled locally.
- The composer sections are Text, Photos, Tags, and Preview.
- Tags are limited to three.
- The aspect ratio control belongs to the post flow, not Settings.
- New posts start at Auto. Settings must not contain a Photos ratio section.
- Auto uses the photo's natural ratio for a single photo and the majority ratio for multiple photos.
- Tapping a photo opens the full-screen crop editor.
- The crop editor supports drag to pan, pinch to zoom, double-tap to toggle zoom, wheel zoom, arrow-key pan, `+` and `-` zoom, `0` to reset, and a ratio chip row.
- Crop data is normalized pan and zoom. The same renderer must produce the composer preview and the published post.
- Do not return to `object-position` based cropping.
- Show a filmstrip for multi-photo posts.
- Keep drafts across Back and Forward. Discard only when the user asks.
- Keep the composer footer above the on-screen keyboard.
- Do not autofocus the composer on touch devices. The keyboard must not open during the entry transition.
- Do not duplicate the add-photo control in the composer footer. The photo tile is the single entry point.

## Chat

- Chat rows open a thread layer.
- The message composer sticks to the top of the keyboard.
- Enter sends. Escape blurs the field first, then closes the layer on the next press.
- Do not autoplay heavy animations in the message list.

## Profile and Settings

- Profile tabs are Posts, Media, and Saved.
- Saved has a lock icon.
- Followers and Following open searchable people layers.
- Settings contains Appearance, private collections (Saved, Liked, Comments), keyboard shortcuts, install, reset, and sign out.
- Private collections keep their lock icons.
- Settings does not contain photo ratio controls.
- Keep the settings gear next to Edit in the profile header.

## Touch, selection, and keyboard

- Everything is non-selectable by default.
- Opt in only for inputs, textareas, editable fields, chat messages, replies, bios, and desktop post text.
- Disable image dragging and the long-press callout.
- Use `touch-action: manipulation` so double-tap zoom does not fight app gestures.
- Mobile form controls are at least 16px so browsers do not auto-zoom.
- The app shell follows `visualViewport` when the keyboard covers the layout viewport.
- When the keyboard is open, the reply bar, chat composer, and compose footer sit directly above it.
- Remove the safe-area bottom padding while typing.
- Scroll the focused field into view inside its own scroll container.
- Tab swipe uses the original behavior: track the gesture, cancel on vertical movement, and switch tabs on release when the horizontal distance passes the threshold. Do not follow the finger.
- Page changes use a short transform-only transition. The incoming view is opaque.
- Image carousels move exactly one photo per swipe. Use a transform pager, not native scroll snapping.
- The carousel must not steal vertical page scrolling.

## Data and persistence

- Main state key: `koinara.v1`.
- UI state key: `koinara.ui.v1`.
- Media database: IndexedDB `koinara-media`, store `media`.
- Persist the active tab, per-tab scroll, search text, profile tab, layer stack, drafts, and theme.
- Keep uploaded avatar data URLs for fallback rendering.
- If a blob is missing, fall back to initials.
- Never write state back after the user clears site data while the app is open.
- Keep `state.version` at 1 unless a real migration is written.

## Code quality

- Keep the codebase small, direct, and consistent.
- Prefer small functions with clear names over clever abstractions.
- Match the existing naming, spacing, and comment style.
- Remove dead code, unused CSS, and unused assets.
- Do not add dependencies for problems the platform already solves.
- Do not add a build step to solve a source-format problem.
- Keep comments for intent and constraints, not for narrating obvious code.
- Do not leave debug globals, console logs, or test hooks in production code.
- Validate with `node --check` for scripts and `node --input-type=module --check < app.js` for the app bundle.
- Test with the service worker disabled in local development (`?nosw`).
- Bump the service worker cache name with every version. Use `koinara-<version>`.

## Language and symbols

- Write plain, direct English.
- Do not use em dashes or en dashes. Use commas, periods, or separate sentences.
- Do not use AI filler such as "delve", "seamless", "elevate", "unlock", "game changer", "in today's fast-paced world", or "it is not just X, it is Y".
- Do not use emoji in code, interface text, commit messages, or documentation.
- Do not use decorative unicode arrows or symbols. Use the bundled Lucide icons.
- Do not add marketing copy to the interface.
- Keep labels short and literal.

## Repository and publishing

- The project uses the PolyForm Noncommercial License 1.0.0 in `LICENSE`.
- Do not change the license without the owner's approval.
- Keep `README.md` and `CHANGELOG.md` current. The required notice lives in `README.md`.
- Publishing is manual. Do not push, deploy, or publish unless the owner explicitly asks.
- After the initial repository setup, the owner controls all publishing.
- Keep the public repository free of private data, tokens, local test artifacts, and editor files.
- The public repository is `TTP-social`. The product name remains Koinara for now.
- Third-party assets must keep their license files in `assets/fonts/OFL.txt` and `assets/icons/LICENSE`.

## Versioning and commits

- The project uses a `1.x` version model.
- The first number is a major release.
- The second number increases by one for every iteration commit.
- `APP_VERSION` in `app.js` is the single source for the current version.
- `CHANGELOG.md` gets an entry for every version.
- Update `APP_VERSION` and the visible version strings with every bump. Do not add a separate version file.
- Commit messages start with `Koinara <version>:` and then a short summary.
- Keep each commit focused. Do not mix unrelated work.
- Run the checks before committing.

## Current file map

- `index.html`: app shell, login, tabs, layers root, scroll indicator.
- `app.css`: tokens, layout, components, motion, responsive rules.
- `app.js`: state, rendering, gestures, history, compose, crop, keyboard.
- `seed.js`: demo users, follows, posts, chats, replies.
- `icons.js`: bundled Lucide subset.
- `sw.js`: offline cache.
- `manifest.json`: install metadata.
- `assets/`: bundled font, icons, and AVIF photos.
- `assets/icons/`: the normal, maskable, and monochrome icon sources, PNG exports, brand mark, and Lucide license.
- `CHANGELOG.md`: version history.
