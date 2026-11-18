# Changelog

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
