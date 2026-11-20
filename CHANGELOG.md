# Changelog

## 1.12

- Added a filled counter triangle to the brand mark, inset from the right edge, and widened the diagonal gaps so every space reads evenly at every size.
- Added a round badge version of the mark for the favicon and places that do not apply a corner radius.
- Rebuilt the normal, maskable, monochrome, Apple touch, and round icon exports from the updated mark.
- Matched the desktop login frame width to the main layout, so the page no longer resizes after signing in.
- Added a faded dot matrix to the empty side strips on wide desktop screens.
- Bumped the service worker cache to `koinara-1.12`.

## 1.11

- Animated the 48px composer height change when cancelling a reply banner at the bottom of a thread, so the comments no longer snap down.
- Bumped the service worker cache to `koinara-1.11`.

## 1.10

- Kept the reply bar height stable while the keyboard is open, so cancelling or sending cannot shrink the scroll padding and clamp the thread.
- Restored the previous thread scroll when a reply target is cancelled.
- Revealed a new reply after the keyboard close settles, using the closed bar height, so sending no longer jumps.
- Revealed a new reply target when the keyboard is already open.
- Used native smooth scrolling for the open reveal and a trailing compositor track for the close.
- Bumped the service worker cache to `koinara-1.10`.

## 1.9

- Added comment likes with the save-style hairline ring and the count under the heart.
- Added tap-to-reply threads with one indent and a "Replying to @handle" line. Removed the separate reply button.
- Hid reply threads by default, with expand and collapse controls and a 10-at-a-time show more flow.
- Added a press-and-hold comment options sheet with a delete action and a confirm step, replacing the inline delete and its layout shift.
- Deleting a comment reparents its child replies instead of deleting the thread.
- Updated the My comments collection with the same like action and long-press delete.
- Expanded the seed to 339 comments, with several 20+ reply threads and varied comment like counts.
- Added native-like composer keyboard handling: a locked shell, fixed transform-driven bars, Chromium VirtualKeyboard support, and an iOS visualViewport fallback with the post-blur viewport fix.
- Made the composer close reliably when the keyboard hides with the field focused, moved it on a compositor transform with tuned keyboard curves, and made the Android back gesture close the keyboard before leaving the layer.
- Scrolled the comment being answered above the bar with native smooth scrolling on open and a compositor track on close, with a slight trailing delay, and returned it without reserving extra bottom space. Cancelling the reply restores the previous scroll.
- Replaced the plain reply label with a full-width reply banner with the target avatar, aligned dismiss button, and a short row and fade transition.
- Bumped the service worker cache to `koinara-1.9`.

## 1.8

- Expanded the local seed database to 27 accounts plus the demo user, 121 posts, 138 comments, 22 chats, 232 messages, 23 liked posts, and 14 bookmarked posts.
- Added 20 new scene photos and 21 new posts, including a five-photo coast walk, with every seed photo used exactly once.
- Added a 137-message unread chat, a love chat, a threat chat, and six more conversations, with varied quick replies.
- Moved tags directly onto posts and kept accounts, replies, chats, messages, follows, and likes/bookmarks as ID-linked rows.
- Reworked Explore into a curated page with trending tags, five suggested people, a ranked discover feed, and six recent photos.
- Improved search with #tag, @handle, and plain word modes, ranked results, counts, a clear button, and incremental more results.
- Limited post media so each of the 38 photos appears in exactly one post.
- Compressed uploads locally to AVIF with a bundled WASM encoder and a WebP fallback, with a tinted processing veil that names AVIF and shows progress.
- Made the reply action and chat send icon-only, centered the send icon, and capped each post at five photos.
- Added exact unread count pills to chat rows, with no display cap.
- Rebuilt the crop editor: a dark stage, a bottom filmstrip, bottom ratio chips, a thick zoom slider, and a full-width Done button. Removed the reset and remove controls.
- Improved mouse wheel zoom and drag panning in the crop editor.
- Rebuilt the crop zoom slider as a native range control with a soft track, a full-height bordered cube handle that forms the bar ends, and a fill that always ends at the cube center.
- Batched slider and pinch zoom to the frame rate and added a short eased glide for wheel zoom.
- Promoted crop images to the compositor with 3D transforms for smoother pinch and wheel zoom.
- Rebuilt the post options sheet as a full-width panel with a fading veil, a smooth sheet slide, drag-down dismissal, consistent concentric corners, stable layout between views, and inline delete confirmation that fades before the sheet closes.
- Constrained handles to lowercase letters, `_`, `-`, and `.`, up to 24 characters, with live sanitising and a leading `@` in the field.
- Removed the section titles and helper copy from the composer, made the preview section full bleed, and enabled carousel browsing in the preview.
- Added a profile photo lightbox that reuses the feed photo pinch, pan, and release spring on a free stage, with wheel zoom on desktop and a tap-anywhere close. The lightbox morphs from the tapped profile picture into place and back on close, and hides the source picture so no duplicate shows.
- Gave every veil the same 340ms fade in both directions, fixed the photo zoom backdrop so it fades out instead of snapping, and made the profile photo morph symmetric on the shared layer timing.
- Made profile pictures circles across the app, including the profile header and the photo lightbox.
- Hard cropped published post photos and saved profile photos into new local AVIF files, and discarded the uncropped sources.
- Removed the profile Edit photo action, and restyled Change photo and Remove photo as matching full-width buttons.
- Added a square profile photo crop editor with the shared zoom slider and a Use photo action, and kept avatar uploads pending until Save.
- Added equal, compact margins to search, compose, chat, and reply bars.
- Fixed the selected segmented-tab hover contrast in dark mode.
- Updated the service worker cache to `koinara-1.8`.

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
