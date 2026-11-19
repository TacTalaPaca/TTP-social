# Changelog

## 1.7

- Reworked the mobile profile header: icon-only Edit and Settings buttons split above the stats, a bordered bio box with the join date, and tighter vertical spacing.
- Made profile tab changes animate only the list, with a 300ms fade and a 16px lift.
- Added press feedback to profile stats, profile tabs, and small controls, and kept hover styles on hover-capable devices only.
- Unified resting borders on the quiet line token and moved hover, focus, and press borders to the stronger token.
- Gave avatars, post photos, grids, and the brand mark the same 9px corner radius as buttons and panels.
- Stopped image long-press menus, image drag, and browser context menus outside text fields.
- Removed the static manifest `theme_color` and kept only a neutral launch `background_color`, so the manifest cannot override the dynamic theme-color metas.
- Replaced the stroked mark with the new filled K across the login, favicon, and app icons.
- Added a pre-paint dark background and an iOS translucent status bar in dark mode.
- Scoped the theme-color metas by system preference and manual theme, matched to the bottom surface.
- Rebuilt the app icons with separate any, maskable, monochrome, Apple touch, shortcut, and favicon assets.
- Scoped hover effects to hover-capable devices. Post action icons have no pressed color change on touch and a desktop-only hover.
- Kept `viewport-fit=cover` and safe-area spacing for Chrome's edge-to-edge rollout in installed PWAs.
- Removed duplicate and unused CSS, icon, and metadata entries.
- Added the new icon assets to the service worker cache.
- Updated the service worker cache to `koinara-1.7`.

## 1.6

- Removed the mobile feed top bar. New post is now a quiet centered button in the tab bar.
- Made post photos and photo grids full-bleed on mobile.
- Kept text and actions on the normal mobile gutter.
- Moved carousel dots below the photos.
- Removed the carousel arrow buttons. Swipe, mouse drag, dots, and keyboard arrows remain.
- Fixed carousel mouse drag so it releases reliably outside the track.
- Smoothed carousel paging and unified the transition easing across pages, layers, compose, and carousels.
- Added temporary pinch-to-zoom on post photos. The photo lifts above the app, hides the source, anchors at the pinch point, and springs back on release.
- Disabled page pinch zoom on mobile so the gesture belongs to the photo.
- Replaced the compose slide with a stable fade and lift, removed the duplicate footer photo picker, and stopped mobile autofocus from opening the keyboard during the transition.
- Gave mobile tab selection a short synchronized color and background fade, cleared sticky hover states on touch devices, and polished desktop sidebar spacing and the New post hover.
- Unified PC hover timing at 120ms and added subtle borders to desktop sidebar tabs.
- Rebuilt the sidebar brand as a centered two-line lockup with an equal-width wordmark and tracked byline. The wordmark is static, not a link.
- Optically centered the mobile unread dot inside the chat bubble.
- Made profile tab changes animate only the list, so the header and tabs stay put.
- Suppressed browser and password-manager autofill buttons in search, comment, and profile fields.
- Replaced the text K with a bolder broken-K mark and refreshed the app icons.
- Reduced the icon set to one SVG app icon and removed all PNG variants.
- Reduced icon stroke weight to 2.25 to match the type.
- Stabilized scroll restoration on refresh and re-render.
- Renamed the project rules file to `AGENTS.md`.
- Updated the service worker cache to `koinara-1.6`.

## 1.5

- Restored standalone install mode.
- Removed fullscreen display from the manifest.
- Kept a single manifest without manifest system bar colors.
- Kept the theme-color meta and color-scheme meta in sync with the active theme.
- Updated the service worker cache to `koinara-1.5`.

## 1.4

- Renamed the manifest to `manifest.json` and kept a single manifest file.
- Removed manifest theme and background colors so the installed app does not paint a system bar background.
- Switched the installed app display to fullscreen so Android hides the system navigation and status bars.
- Kept the theme-color meta and color-scheme meta in sync with the active theme for browser mode.
- Updated the service worker cache to `koinara-1.4`.

## 1.3

- Set a transparent manifest theme color for the Android system navigation bar.
- Kept the browser theme color in sync with the selected light or dark theme.
- Updated the page color scheme at runtime so system bar icons follow the app theme.
- Refined page transitions to slide and fade with vertical motion on desktop and more horizontal movement on mobile.
- Kept all views laid out so tab switches do not wait on layout.
- Contained tab transitions inside the main column.
- Updated the service worker cache to `koinara-1.3`.

## 1.2

- Added the PolyForm Noncommercial 1.0.0 license, README, and repository metadata.
- Improved desktop page transitions with a slower fade and lift.
- Tuned mobile page transitions for a clearer, less rushed release.
- Added a subtle content swap for profile tab changes.
- Expanded the web app manifest with shortcuts, display overrides, launch handling, and language metadata.
- Added install-state handling so the Install app row disappears when running installed.
- Moved the visible version to a single app constant.
- Added repository readiness files and third-party license notices.
- Renamed the public repository to TTP-social.
- Removed the duplicate AGENTS.md symlink. ADENTS.md is the single rules file.
- Updated the service worker cache to `koinara-v15`.

## 1.1

- Reworked mobile viewport sizing so browser chrome and the on-screen keyboard no longer change the app scale.
- Kept form controls at 16px on touch devices to stop automatic input zoom.
- Removed text selection from the interface by default, with explicit opt-ins for fields and readable content.
- Changed post taps so only the comments button opens a post. Double-tap likes the post.
- Rebuilt the image pipeline with a full-screen crop editor, pan, pinch zoom, ratio chips, filmstrip, reset, and live preview.
- Removed the Photos section from Settings. New posts always start at Auto.
- Replaced the image carousel with a transform-based pager that moves exactly one photo per swipe.
- Reworked tab swipes to use the original release threshold with a light page transition.
- Added full navigation snapshots so Back and Forward restore tabs, layers, scroll, search, drafts, and crops.
- Added keyboard-aware layout for reply bars, chat composers, and the compose footer.
- Added CHANGELOG and ADENTS.md.
