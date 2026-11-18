# Changelog

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
- Added VERSION, CHANGELOG, and ADENTS.md.
