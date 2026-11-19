/* ------------------------------------------------------------------ utils */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const KEY = 'koinara.v1';
const APP_VERSION = '1.11';
const hadStateOnBoot = (() => { try { return localStorage.getItem(KEY) !== null; } catch (e) { return false; } })();
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = (p = 'x') => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function rel(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  if (s < 604800) return Math.floor(s / 86400) + 'd';
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const fmt = (n) => n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
const plural = (n, word) => `${n} ${n === 1 ? word : word === 'reply' ? 'replies' : word + 's'}`;
const HANDLE_MAX = 24;
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z_.-]+/g, '').slice(0, HANDLE_MAX);

function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

function tone(id) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) % 997;
  return (h % 5) + 1;
}

const PHOTO_RATIO_KEYS = ['auto', '4:3', '3:4', '16:9', '1:1'];
const PHOTO_RATIOS = { '4:3': 4 / 3, '3:4': 3 / 4, '16:9': 16 / 9, '1:1': 1 };
const PHOTO_RATIO_CSS = { '4:3': '4 / 3', '3:4': '3 / 4', '16:9': '16 / 9', '1:1': '1 / 1' };
const ratioLabel = (key) => key === 'auto' ? 'Auto' : key;
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

function ratioValue(css) {
  const parts = String(css || '4 / 3').split('/').map((v) => Number(String(v).trim()));
  if (!parts.length || !parts[0] || !Number.isFinite(parts[0])) return 4 / 3;
  return parts[1] && Number.isFinite(parts[1]) ? parts[0] / parts[1] : parts[0];
}

function ratioCssForAspect(aspect) {
  const a = clamp(Number(aspect) || 4 / 3, .5, 2.2);
  if (Math.abs(a - 1) < .004) return '1 / 1';
  return `${a.toFixed(3)} / 1`;
}

function ratioFor(ratio, images) {
  if (ratio && PHOTO_RATIO_CSS[ratio]) return PHOTO_RATIO_CSS[ratio];
  if (!images || !images.length) return '4 / 3';
  if (images.length === 1) {
    const im = images[0];
    return ratioCssForAspect((im.w || 4) / (im.h || 3));
  }
  const counts = {};
  for (const im of images) {
    let best = '4:3';
    let diff = Infinity;
    for (const [key, value] of Object.entries(PHOTO_RATIOS)) {
      const d = Math.abs(Math.log((im.w / im.h) / value));
      if (d < diff) { diff = d; best = key; }
    }
    counts[best] = (counts[best] || 0) + 1;
  }
  let bestKey = '4:3';
  let bestCount = -1;
  for (const [key, count] of Object.entries(counts)) {
    if (count > bestCount || (count === bestCount && PHOTO_RATIOS[key] < PHOTO_RATIOS[bestKey])) {
      bestCount = count;
      bestKey = key;
    }
  }
  return PHOTO_RATIO_CSS[bestKey];
}

function postRatio(p) { return ratioFor(p.ratio, p.images); }

function normalizeCrop(c) {
  if (!c || typeof c !== 'object') return { x: 0, y: 0, z: 1 };
  let x = Number(c.x);
  let y = Number(c.y);
  let z = Number(c.z);
  // Older posts stored object-position percentages (0 to 100).
  if (Math.abs(x) > 1.001 || Math.abs(y) > 1.001) {
    x = (clamp(x, 0, 100) - 50) / 50;
    y = (clamp(y, 0, 100) - 50) / 50;
  }
  return {
    x: clamp(Number.isFinite(x) ? x : 0, -1, 1),
    y: clamp(Number.isFinite(y) ? y : 0, -1, 1),
    z: clamp(Number.isFinite(z) ? z : 1, 1, 4)
  };
}

function cropMetrics(im, ratioCss) {
  const c = normalizeCrop(im.crop);
  const frame = ratioValue(ratioCss);
  const aspect = Math.max(.0001, (im.w || 4) / (im.h || 3));
  const bw = Math.max(1, aspect / frame) * 100;
  const bh = Math.max(1, frame / aspect) * 100;
  const w = bw * c.z;
  const h = bh * c.z;
  // Pan is stored as a fraction of the available travel. Translate is
  // expressed in the image's own (unscaled) box so zoom/pan stay compositor
  // friendly and never trigger layout.
  const px = c.x * (w - 100) / 2 / bw * 100;
  const py = c.y * (h - 100) / 2 / bh * 100;
  return { x: c.x, y: c.y, z: c.z, bw, bh, w, h, px, py };
}

function cropStyle(im, ratioCss) {
  const m = cropMetrics(im, ratioCss);
  return `width:${m.bw}%;height:${m.bh}%;transform:translate3d(-50%,-50%,0) translate3d(${m.px}%,${m.py}%,0) scale(${m.z})`;
}

function editorImg(a, ratioCss) {
  const style = cropStyle(a, ratioCss);
  if (a.m) return `<img data-media="${a.m}" alt="" draggable="false" style="${style}">`;
  return `<img src="assets/img/${esc(a.s)}-800.avif" alt="${esc(a.a || '')}" draggable="false" style="${style}">`;
}

/* ------------------------------------------------------------------ state */

function loadState() {
  const base = seedState();
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!s || typeof s !== 'object' || s.version !== 1) return base;

    const arr = Array.isArray;
    const map = (v) => v && typeof v === 'object' && !Array.isArray(v);
    const mergeRows = (seed, saved) => {
      const rows = arr(saved) ? saved.filter((r) => r && r.id) : [];
      const byId = new Map(rows.map((r) => [r.id, r]));
      const out = seed.map((r) => byId.has(r.id) ? { ...r, ...byId.get(r.id) } : r);
      const seedIds = new Set(seed.map((r) => r.id));
      for (const r of rows) if (!seedIds.has(r.id)) out.push(r);
      return out;
    };
    const follows = () => {
      if (!map(s.follows)) return base.follows;
      const out = {};
      for (const [id, list] of Object.entries(s.follows)) {
        if (arr(list)) out[id] = list.filter((v) => typeof v === 'string' && v !== id);
      }
      for (const id of Object.keys(base.follows)) if (!(id in out)) out[id] = base.follows[id];
      return out;
    };
    const mergeMap = (seedMap, savedMap) => {
      if (!map(savedMap)) return seedMap;
      const out = { ...seedMap };
      for (const [key, val] of Object.entries(savedMap)) if (arr(val)) out[key] = val;
      return out;
    };

    return {
      version: 1,
      theme: ['auto', 'light', 'dark'].includes(s.theme) ? s.theme : base.theme,
      auth: s.auth && typeof s.auth === 'object' ? s.auth : null,
      me: map(s.me) ? { ...base.me, ...s.me } : base.me,
      users: mergeRows(base.users, s.users),
      follows: follows(),
      posts: mergeRows(base.posts, s.posts),
      replies: mergeMap(base.replies, s.replies),
      chats: mergeRows(base.chats, s.chats),
      messages: mergeMap(base.messages, s.messages),
      liked: arr(s.liked) ? s.liked.filter((id) => typeof id === 'string') : [],
      bookmarked: arr(s.bookmarked) ? s.bookmarked.filter((id) => typeof id === 'string') : [],
      likedReplies: arr(s.likedReplies) ? s.likedReplies.filter((id) => typeof id === 'string') : [],
      uploaded: map(s.uploaded) ? s.uploaded : {}
    };
  } catch (e) {
    return base;
  }
}

let state = loadState();
let saveTimer;
let wroteState = false;
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = 0;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    wroteState = true;
  } catch (e) {}
}
const save = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 120);
};

const UI_KEY = 'koinara.ui.v1';
const hadUIOnBoot = (() => { try { return localStorage.getItem(UI_KEY) !== null; } catch (e) { return false; } })();
const TABS = ['feed', 'explore', 'chat', 'profile'];

function sanitizeDraft(v) {
  if (!v || typeof v !== 'object') return null;
  const text = typeof v.text === 'string' ? v.text.slice(0, 500) : '';
  const tags = Array.isArray(v.tags)
    ? v.tags.filter((t) => typeof t === 'string' && t).slice(0, 3).map((t) => t.slice(0, 24))
    : [];
  const ratio = PHOTO_RATIO_KEYS.includes(v.ratio) ? v.ratio : 'auto';
  const attachments = Array.isArray(v.attachments)
    ? v.attachments.filter((a) => a && typeof a.m === 'string' && Number.isFinite(a.w) && Number.isFinite(a.h)).slice(0, 5).map((a) => ({
        m: a.m,
        w: Math.max(1, Math.round(a.w)),
        h: Math.max(1, Math.round(a.h)),
        crop: normalizeCrop(a.crop)
      }))
    : [];
  if (!text.trim() && !tags.length && !attachments.length) return null;
  return { text, tags, ratio, attachments };
}

function loadUI() {
  const blank = { tab: 'feed', scrolls: {}, explore: '', profileTab: 'posts', layers: [], composeDraft: null };
  try {
    const v = JSON.parse(localStorage.getItem(UI_KEY) || 'null');
    if (!v || typeof v !== 'object') return blank;
    const scrolls = {};
    for (const key of TABS) {
      const n = Number(v.scrolls && v.scrolls[key]);
      if (Number.isFinite(n) && n > 0) scrolls[key] = Math.min(n, 1000000);
    }
    const kinds = new Set(['profile', 'people', 'post', 'avatar', 'chat', 'settings', 'shortcuts', 'saved', 'liked', 'comments', 'compose', 'edit', 'crop', 'confirm', 'comment-menu']);
    const savedLayers = Array.isArray(v.layers) ? v.layers : [];
    const layers = [];
    for (const d of savedLayers.slice(0, 8)) {
      if (!d || typeof d !== 'object' || !kinds.has(d.type)) continue;
      const row = { type: d.type };
      if (typeof d.id === 'string' && d.id.length <= 40) row.id = d.id;
      if (d.kind === 'followers' || d.kind === 'following') row.kind = d.kind;
      if (Number.isFinite(d.scroll) && d.scroll > 0) row.scroll = Math.min(d.scroll, 1000000);
      if (typeof d.q === 'string' && d.q) row.q = d.q.slice(0, 80);
      if (typeof d.draft === 'string' && d.draft) row.draft = d.draft.slice(0, 500);
      if (d.type === 'compose' && d.draft && typeof d.draft === 'object') row.draft = sanitizeDraft(d.draft);
      if (d.type === 'crop' && Number.isFinite(d.index)) row.index = Math.max(0, Math.min(4, Math.round(d.index)));
      if (d.type === 'confirm' && ['reset', 'logout', 'discard'].includes(d.kind)) row.kind = d.kind;
      layers.push(row);
    }
    const draft = sanitizeDraft(v.composeDraft);
    return {
      tab: TABS.includes(v.tab) ? v.tab : 'feed',
      scrolls,
      explore: typeof v.explore === 'string' ? v.explore.slice(0, 80) : '',
      profileTab: ['media', 'saved'].includes(v.profileTab) ? v.profileTab : 'posts',
      layers,
      composeDraft: draft
    };
  } catch (e) {
    return blank;
  }
}

let ui = loadUI();
let uiTimer;
let wroteUI = false;
function saveUINow() {
  clearTimeout(uiTimer);
  uiTimer = 0;
  try {
    if (!restoringLayers) {
      ui.layers = captureLayers();
      replaceNav();
    }
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
    wroteUI = true;
  } catch (e) {}
}
function saveUI() {
  clearTimeout(uiTimer);
  uiTimer = setTimeout(saveUINow, 160);
}

function flushSaved() {
  let stateThere = true;
  let uiThere = true;
  try {
    stateThere = localStorage.getItem(KEY) !== null;
    uiThere = localStorage.getItem(UI_KEY) !== null;
  } catch (e) {}

  // If the user cleared site data while the app was open, do not write it back.
  if (stateThere || (!hadStateOnBoot && !wroteState)) saveNow();
  if (uiThere || (!hadUIOnBoot && !wroteUI)) saveUINow();
}


const user = (id) => id === 'me' ? state.me : (state.users.find((u) => u.id === id) || { id, name: 'Unknown', handle: 'unknown', bio: '', joined: '2024' });
const postById = (id) => state.posts.find((p) => p.id === id);
const repliesOf = (id) => state.replies[id] || [];
const replyById = (postId, replyId) => repliesOf(postId).find((r) => r.id === replyId);
const threadShown = new Map();
const threadKey = (postId, rootId) => postId + ':' + rootId;
const messagesOf = (chatId) => state.messages[chatId] || [];

function replyRootId(postId, replyId) {
  const byId = new Map(repliesOf(postId).map((r) => [r.id, r]));
  let reply = byId.get(replyId);
  const seen = new Set();
  while (reply && reply.parentId && byId.has(reply.parentId) && !seen.has(reply.id)) {
    seen.add(reply.id);
    reply = byId.get(reply.parentId);
  }
  return reply ? reply.id : null;
}

function myComments() {
  const out = [];
  for (const [postId, list] of Object.entries(state.replies)) {
    const post = postById(postId);
    if (!post) continue;
    for (const reply of list) if (reply.userId === 'me') out.push({ reply, post });
  }
  return out.sort((a, b) => b.reply.ts - a.reply.ts);
}

function commentItem({ reply, post }) {
  const u = user(post.userId);
  const text = (post.text || 'Photo post').trim();
  const excerpt = text.length > 140 ? text.slice(0, 140).trimEnd() + '...' : text;
  return `<div class="comment-item" data-reply="${reply.id}" data-post="${post.id}">
    <div class="comment-main">
      <button class="comment-open" type="button" data-act="open" data-id="${post.id}" aria-label="Open the post this comment is on">
        <div class="comment-top"><span>On a post by ${esc(u.name)}</span><time datetime="${new Date(reply.ts).toISOString()}" data-ts="${reply.ts}">${rel(reply.ts)}</time></div>
        ${replyParentHtml(reply, post.id)}
        <div class="comment-text">${esc(reply.text)}</div>
        <div class="comment-quote">${esc(excerpt)}</div>
      </button>
    </div>
    <div class="comment-acts">
      ${replyLikeButton(reply, post.id)}
    </div>
  </div>`;
}

function refreshCollectionLayers(type) {
  for (const entry of layers) {
    if (entry.descriptor && entry.descriptor.type === type && entry.refresh) entry.refresh();
  }
  scheduleScrollbar();
}

const knownUser = (id) => id === 'me' || state.users.some((u) => u.id === id);
const isFollowing = (from, to) => from !== to && (state.follows[from] || []).includes(to);
const followingOf = (id) => (state.follows[id] || []).filter((other) => other !== id && knownUser(other));
function followersOf(id) {
  const out = [];
  for (const [other, list] of Object.entries(state.follows)) {
    if (other !== id && knownUser(other) && list.includes(id)) out.push(other);
  }
  return out;
}
function followedByFriends(id) {
  return followingOf('me')
    .filter((other) => other !== id && isFollowing(other, id))
    .map(user);
}
function toggleFollow(id) {
  if (!id || id === 'me' || !knownUser(id)) return;
  const list = state.follows.me || (state.follows.me = []);
  const i = list.indexOf(id);
  if (i >= 0) list.splice(i, 1);
  else list.push(id);
  save();
  refreshFollow(id);
  renderFeed();
  renderProfile();
  if (currentTab === 'explore') renderExplore();
  toast(i >= 0 ? `Unfollowed ${user(id).name}` : `Following ${user(id).name}`);
}
function updateStatCounts(id) {
  const u = user(id);
  $$(`[data-stats="${id}"]`).forEach((box) => {
    const f = box.querySelector('[data-stat="followers"]');
    const g = box.querySelector('[data-stat="following"]');
    if (f) f.textContent = fmt(followersOf(id).length);
    if (g) g.textContent = fmt(followingOf(id).length);
    box.setAttribute('aria-label', `${u.name}: ${followersOf(id).length} followers, ${followingOf(id).length} following`);
  });
}
function refreshFollow(id) {
  const on = isFollowing('me', id);
  $$(`[data-follow-btn="${id}"]`).forEach((btn) => {
    btn.classList.toggle('ghost', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.setAttribute('aria-label', on ? `Unfollow ${user(id).name}` : `Follow ${user(id).name}`);
    btn.innerHTML = on ? `${icon('check')}Following` : 'Follow';
  });
  updateStatCounts(id);
  updateStatCounts('me');
}

/* ------------------------------------------------------------------ media */

let dbPromise = null;
function dbOpen() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open('koinara-media', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('media');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbPut(key, blob) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').put(blob, key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readonly');
    const req = tx.objectStore('media').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear() {
  const db = await dbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('media', 'readwrite');
    tx.objectStore('media').clear();
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

const urlCache = new Map();

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function mediaURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  try {
    const blob = await idbGet(id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch (e) {
    return null;
  }
}

/* Keep a small copy of the avatar inside the app state, so it survives an
   IndexedDB eviction and still renders when blob URLs are unavailable. */
async function ensureAvatarData() {
  const a = state.me && state.me.avatar;
  if (!a || !a.m || a.d) return;
  try {
    const blob = await idbGet(a.m);
    if (!blob) return;
    a.d = await blobToDataURL(blob);
    saveNow();
    const feed = viewEl('feed');
    const profile = viewEl('profile');
    const feedTop = feed ? feed.scrollTop : 0;
    const profileTop = profile ? profile.scrollTop : 0;
    renderProfile();
    renderFeed();
    requestAnimationFrame(() => {
      if (feed) feed.scrollTop = feedTop;
      if (profile) profile.scrollTop = profileTop;
    });
  } catch (e) {}
}

/* ------------------------------------------------------------------ images */

function imgTag(im, sizes) {
  if (im.s) {
    return `<img src="assets/img/${im.s}-400.avif" srcset="assets/img/${im.s}-400.avif 400w, assets/img/${im.s}-800.avif 800w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="lazy" decoding="async" draggable="false" data-fade style="aspect-ratio:${im.w}/${im.h}">`;
  }
  return `<img data-media="${im.m}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="lazy" decoding="async" draggable="false" data-fade style="aspect-ratio:${im.w}/${im.h}">`;
}

function photoImg(im, sizes, eager = false, ratioCss) {
  const style = cropStyle(im, ratioCss);
  const load = eager ? 'eager' : 'lazy';
  if (im.s) {
    return `<img src="assets/img/${im.s}-400.avif" srcset="assets/img/${im.s}-400.avif 400w, assets/img/${im.s}-800.avif 800w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="${load}" decoding="async" draggable="false" data-fade style="${style}">`;
  }
  return `<img data-media="${im.m}" data-crop-for="${im.m}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="${load}" decoding="async" draggable="false" data-fade style="${style}">`;
}

function mediaHeart() {
  return `<span class="media-heart" aria-hidden="true"><span class="media-heart-ic">${icon('heart')}</span></span>`;
}

function mediaHtml(p) {
  const imgs = p.images || [];
  if (!imgs.length) return '';
  const ratio = postRatio(p);
  const sizes = '(min-width: 600px) 528px, 100vw';
  if (imgs.length === 1) {
    const frame = `<div class="photo-single" style="aspect-ratio:${ratio}"><div class="zoom-layer">${photoImg(imgs[0], sizes, false, ratio)}</div></div>`;
    return `<div class="media">${frame}${mediaHeart()}</div>`;
  }
  const slides = imgs.map((im, i) => {
    const frame = `<div class="photo-frame"><div class="zoom-layer">${photoImg(im, sizes, true, ratio)}</div></div>`;
    return `<div class="carousel-slide" role="group" aria-roledescription="slide" aria-label="Photo ${i + 1} of ${imgs.length}">${frame}</div>`;
  }).join('');
  const dots = imgs.map((_, i) => `<button class="cdot${i === 0 ? ' on' : ''}" type="button" data-act="cdots" data-i="${i}" aria-label="Show photo ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('');
  return `<div class="media has-carousel" data-carousel style="--ratio:${ratio}">
    <div class="carousel" role="group" aria-roledescription="carousel" aria-label="Photos">
      <div class="carousel-track" tabindex="0">${slides}</div>
    </div>
    <div class="carousel-dots">${dots}</div>
    ${mediaHeart()}
  </div>`;
}

function hydrate(root = document) {
  $$('.av.has-img img', root).forEach((img) => {
    if (img.dataset.avwired) return;
    img.dataset.avwired = '1';
    const box = img.closest('.av');
    const ok = () => { if (img.naturalWidth > 0) box.classList.add('ok'); };
    if (img.complete) ok();
    else {
      img.addEventListener('load', ok, { once: true });
      img.addEventListener('error', () => img.remove(), { once: true });
    }
  });

  $$('img[data-fade]', root).forEach((img) => {
    if (img.dataset.wired) return;
    img.dataset.wired = '1';
    const show = () => img.classList.add('ld');
    if (img.complete && img.naturalWidth > 0) show();
    else {
      img.addEventListener('load', show, { once: true });
      img.addEventListener('error', show, { once: true });
    }
  });

  $$('[data-media]', root).forEach((el) => {
    if (el.dataset.srced) return;
    el.dataset.srced = '1';
    mediaURL(el.dataset.media).then((url) => {
      if (!url) return;
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) return;
      if (!img.dataset.wired) {
        img.dataset.wired = '1';
        img.addEventListener('load', () => img.classList.add('ld'), { once: true });
        img.addEventListener('error', () => img.classList.add('ld'), { once: true });
      }
      img.src = url;
      if (img.complete && img.naturalWidth > 0) img.classList.add('ld');
    });
  });

  wireCarousels(root);
  wirePhotoZooms(root);
}

function carouselDots(car, index) {
  [...car.querySelectorAll('.cdot')].forEach((dot, i) => {
    const on = i === index;
    dot.classList.toggle('on', on);
    if (on) dot.setAttribute('aria-current', 'true');
    else dot.removeAttribute('aria-current');
  });
}

function carouselGo(car, index, animate = true) {
  const track = car.querySelector('.carousel-track');
  const slides = car.querySelectorAll('.carousel-slide');
  if (!track || !slides.length) return;
  const target = Math.max(0, Math.min(slides.length - 1, index));
  const width = track.clientWidth;
  if (!width) return;
  car._index = target;
  carouselDots(car, target);
  clearTimeout(car._animTimer);
  if (animate && !reducedMotion()) {
    track.classList.add('animating');
    track.style.transition = 'transform 320ms var(--ease)';
    car._animTimer = setTimeout(() => track.classList.remove('animating'), 350);
  } else {
    track.style.transition = 'none';
    track.classList.remove('animating');
  }
  track.style.transform = `translate3d(${-target * width}px, 0, 0)`;
}

function wireCarousels(root = document) {
  $$('[data-carousel]', root).forEach((car) => {
    if (car.dataset.wired) return;
    car.dataset.wired = '1';
    const track = car.querySelector('.carousel-track');
    const dots = [...car.querySelectorAll('.cdot')];
    if (!track || !dots.length) return;
    car._index = 0;
    let width = track.clientWidth || car.clientWidth;
    let drag = null;
    let raf = 0;
    let last = null;

    const setX = (px) => {
      track.style.transform = `translate3d(${px}px, 0, 0)`;
    };
    const apply = () => {
      raf = 0;
      if (!drag || drag.axis !== 'x') return;
      setX(-drag.index * drag.width + drag.baseX + drag.dx);
    };
    const settle = (target, d) => {
      track.classList.remove('dragging');
      track.classList.add('animating');
      track.style.transition = 'none';
      if (d) track.style.transform = `translate3d(${-d.index * d.width + d.baseX + d.dx}px, 0, 0)`;
      void track.offsetWidth;
      requestAnimationFrame(() => carouselGo(car, target));
    };
    const reset = () => {
      if (!drag) return;
      const d = drag;
      cancelAnimationFrame(raf);
      raf = 0;
      track.classList.remove('dragging');
      track.style.transition = 'none';
      setX(-car._index * (d.width || width));
      drag = null;
      if (d.pointerId != null) {
        try { track.releasePointerCapture(d.pointerId); } catch (err) {}
      }
    };

    const start = (x, y) => {
      width = track.clientWidth || car.clientWidth;
      if (!width) return;
      cancelAnimationFrame(raf);
      raf = 0;
      const index = car._index || 0;
      let currentX = -index * width;
      const computed = getComputedStyle(track).transform;
      if (computed && computed !== 'none') {
        try { currentX = new DOMMatrixReadOnly(computed).m41; } catch (err) {}
      }
      track.style.transition = 'none';
      track.style.transform = `translate3d(${currentX}px, 0, 0)`;
      drag = {
        x, y,
        lastX: x,
        lastT: performance.now(),
        vx: 0,
        dx: 0,
        axis: null,
        width,
        index,
        baseX: currentX + index * width
      };
    };

    const move = (x, y, now) => {
      if (!drag) return;
      const dx = x - drag.x;
      const dy = y - drag.y;
      if (!drag.axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.15) { drag = null; return; }
        drag.axis = 'x';
        track.classList.add('dragging');
      }
      if (drag.axis !== 'x') return;
      // Edge resistance so the first/last photo feels anchored.
      if ((drag.index === 0 && dx > 0) || (drag.index === dots.length - 1 && dx < 0)) dx *= .3;
      drag.dx = dx;
      const dt = Math.max(1, now - drag.lastT);
      drag.vx = (x - drag.lastX) / dt;
      drag.lastX = x;
      drag.lastT = now;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    const end = (x) => {
      if (!drag) return;
      const d = drag;
      cancelAnimationFrame(raf);
      raf = 0;
      if (d.axis !== 'x') {
        drag = null;
        if (d.pointerId != null) {
          try { track.releasePointerCapture(d.pointerId); } catch (err) {}
        }
        return;
      }
      const dx = d.dx;
      const velocity = Math.abs(d.vx);
      const dir = dx < 0 ? 1 : -1;
      let target = d.index;
      if (Math.abs(dx) > d.width * .18 || (velocity > .32 && Math.sign(dx) === Math.sign(d.vx))) {
        target = d.index + dir;
      }
      target = Math.max(0, Math.min(dots.length - 1, target));
      suppressClickUntil = performance.now() + 280;
      drag = null;
      if (d.pointerId != null) {
        try { track.releasePointerCapture(d.pointerId); } catch (err) {}
      }
      settle(target, d);
    };

    track.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { reset(); return; }
      const t = e.touches[0];
      start(t.clientX, t.clientY);
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (!drag || e.touches.length !== 1) return;
      const t = e.touches[0];
      move(t.clientX, t.clientY, performance.now());
    }, { passive: true });

    track.addEventListener('touchend', (e) => {
      if (!drag) return;
      const t = e.changedTouches[0];
      end(t.clientX);
    }, { passive: true });

    track.addEventListener('touchcancel', reset, { passive: true });

    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      start(e.clientX, e.clientY);
      if (!drag) return;
      drag.pointerId = e.pointerId;
      try { track.setPointerCapture(e.pointerId); } catch (err) {}
    });

    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerType !== 'mouse') return;
      move(e.clientX, e.clientY, performance.now());
    });

    const endMouse = (e) => {
      if (!drag || e.pointerType !== 'mouse' || e.pointerId !== drag.pointerId) return;
      end(e.clientX);
    };
    track.addEventListener('pointerup', endMouse);
    document.addEventListener('pointerup', endMouse);
    document.addEventListener('pointercancel', reset);
    track.addEventListener('lostpointercapture', reset);

    track.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return;
      e.preventDefault();
      if (e.key === 'Home') carouselGo(car, 0);
      else if (e.key === 'End') carouselGo(car, dots.length - 1);
      else carouselGo(car, (car._index || 0) + (e.key === 'ArrowRight' ? 1 : -1));
    });

    let wheelLock = 0;
    track.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      const now = performance.now();
      if (now < wheelLock) return;
      wheelLock = now + 260;
      carouselGo(car, (car._index || 0) + (e.deltaX > 0 ? 1 : -1));
    }, { passive: false });

    addEventListener('resize', () => {
      width = track.clientWidth || car.clientWidth;
      if (!width) return;
      track.style.transition = 'none';
      setX(-(car._index || 0) * width);
    }, { passive: true });

    track.style.transition = 'none';
    setX(0);
  });
}

const ZOOM_SPRING = 'transform 340ms cubic-bezier(.18, 1.25, .32, 1)';

// One gesture model for feed photos and the profile photo lightbox. Pinch
// scales around the moving midpoint, one finger pans, and letting go returns
// the photo to its resting transform with the same spring.
function pinchZoom(target, opts = {}) {
  const pointers = new Map();
  const stage = opts.stage || (() => target);
  const rect = opts.rect || (() => target.getBoundingClientRect());
  let zoom = { z: 1, x: 0, y: 0 };
  let pinch = null;
  let pan = null;
  let moved = false;
  let springTimer = 0;

  const apply = () => {
    const el = stage();
    if (el) el.style.transform = `translate3d(${zoom.x}px, ${zoom.y}px, 0) scale(${zoom.z})`;
  };

  const atRest = () => zoom.z <= 1.01 && Math.abs(zoom.x) < 1 && Math.abs(zoom.y) < 1;

  const clearSpring = () => {
    if (!springTimer) return;
    clearTimeout(springTimer);
    springTimer = 0;
  };

  const spring = () => {
    const el = stage();
    zoom = { z: 1, x: 0, y: 0 };
    if (!el) return;
    clearSpring();
    el.style.transition = reducedMotion() ? 'none' : ZOOM_SPRING;
    el.style.transform = 'translate3d(0, 0, 0) scale(1)';
    if (reducedMotion()) return;
    springTimer = setTimeout(() => {
      springTimer = 0;
      el.style.transition = '';
    }, 380);
  };

  const centre = () => {
    const r = rect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const startPan = () => {
    const only = pointers.values().next().value;
    if (!only) return;
    pan = { x: only.x, y: only.y, baseX: zoom.x, baseY: zoom.y };
  };

  const startPinch = () => {
    const pts = [...pointers.values()];
    if (pts.length < 2) return;
    const c = centre();
    const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    pinch = {
      dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      z: zoom.z,
      cx: c.x,
      cy: c.y,
      originX: (mid.x - c.x - zoom.x) / zoom.z,
      originY: (mid.y - c.y - zoom.y) / zoom.z
    };
    pan = null;
  };

  const down = (e) => {
    if (e.pointerType === 'mouse' && (!opts.mouse || e.button !== 0)) return;
    if (opts.skip && e.target.closest && e.target.closest(opts.skip)) return;
    try { target.setPointerCapture(e.pointerId); } catch (err) {}
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      moved = false;
      clearSpring();
      const el = stage();
      if (el) el.style.transition = 'none';
    }
    if (pointers.size === 2) {
      if (e.cancelable) e.preventDefault();
      moved = true;
      if (opts.start) opts.start();
      startPinch();
    } else if (pointers.size === 1 && !atRest() && (!opts.ready || opts.ready())) {
      startPan();
    }
  };

  const move = (e) => {
    if (!pointers.has(e.pointerId)) return;
    const last = pointers.get(e.pointerId);
    if (!moved && Math.hypot(e.clientX - last.x, e.clientY - last.y) > 6) moved = true;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (opts.ready && !opts.ready()) return;
    if (pointers.size >= 2 && pinch) {
      if (e.cancelable) e.preventDefault();
      const pts = [...pointers.values()];
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      zoom.z = clamp(pinch.z * dist / pinch.dist, 1, 4.5);
      zoom.x = (mid.x - pinch.cx) - pinch.originX * zoom.z;
      zoom.y = (mid.y - pinch.cy) - pinch.originY * zoom.z;
      apply();
    } else if (pan && pointers.size === 1) {
      if (e.cancelable) e.preventDefault();
      zoom.x = pan.baseX + (e.clientX - pan.x);
      zoom.y = pan.baseY + (e.clientY - pan.y);
      apply();
    }
  };

  const up = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size === 1) {
      pinch = null;
      startPan();
      return;
    }
    if (pointers.size) return;
    pinch = null;
    pan = null;
    const rest = atRest();
    const wasMoved = moved;
    moved = false;
    if (!rest) spring();
    if (opts.end) opts.end(rest, wasMoved);
  };

  target.addEventListener('pointerdown', down);
  target.addEventListener('pointermove', move, { passive: false });
  target.addEventListener('pointerup', up);
  target.addEventListener('pointercancel', up);

  return {
    zoomBy(factor, clientX, clientY) {
      const c = centre();
      const qx = clientX - c.x;
      const qy = clientY - c.y;
      const ux = (qx - zoom.x) / zoom.z;
      const uy = (qy - zoom.y) / zoom.z;
      clearSpring();
      const el = stage();
      if (el) el.style.transition = 'none';
      zoom.z = clamp(zoom.z * factor, 1, 4.5);
      zoom.x = qx - ux * zoom.z;
      zoom.y = qy - uy * zoom.z;
      apply();
    },
    destroy() {
      clearSpring();
      target.removeEventListener('pointerdown', down);
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
    }
  };
}

function wirePhotoZooms(root = document) {
  $$('.post .media', root).forEach((media) => {
    if (media.dataset.zoomWired) return;
    media.dataset.zoomWired = '1';

    let overlay = null;
    let stage = null;
    let frameRect = null;
    let closing = false;

    const isCarousel = () => media.hasAttribute('data-carousel');

    const activeLayer = () => {
      if (isCarousel()) {
        const slides = media.querySelectorAll('.carousel-slide');
        const index = Math.max(0, Math.min(slides.length - 1, media._index || 0));
        return slides[index] ? slides[index].querySelector('.zoom-layer') : null;
      }
      return media.querySelector('.photo-single .zoom-layer');
    };

    const open = () => {
      if (overlay || closing) return;
      const layer = activeLayer();
      if (!layer) return;
      const frameEl = layer.parentElement;
      const rect = frameEl.getBoundingClientRect();
      const node = document.createElement('div');
      node.className = 'photo-zoom-overlay';
      const backdrop = document.createElement('div');
      backdrop.className = 'photo-zoom-backdrop';
      const st = document.createElement('div');
      st.className = 'photo-zoom-stage';
      st.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border-radius:${getComputedStyle(frameEl).borderRadius};`;
      const clone = layer.cloneNode(true);
      clone.style.transform = '';
      st.append(clone);
      node.append(backdrop, st);
      document.body.append(node);
      requestAnimationFrame(() => node.classList.add('on'));
      overlay = node;
      stage = st;
      frameRect = rect;
      media.classList.add('zooming-source');
    };

    const finish = (node) => {
      if (node.isConnected) node.remove();
      media.classList.remove('zooming-source');
      closing = false;
    };

    pinchZoom(media, {
      stage: () => stage,
      rect: () => frameRect || media.getBoundingClientRect(),
      skip: 'button, a',
      start: open,
      ready: () => !!overlay,
      end(rest) {
        if (!overlay) return;
        const node = overlay;
        overlay = null;
        stage = null;
        node.classList.add('closing');
        if (rest || reducedMotion()) finish(node);
        else {
          closing = true;
          setTimeout(() => finish(node), Math.max(380, VEIL_MS + 20));
        }
      }
    });
  });
}

function injectIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

/* ------------------------------------------------------------------ avatars */

function avatarCropCss(a) {
  if (!a || !a.crop || !a.w || !a.h) return '';
  return cropStyle(a, '1 / 1');
}

function av(u, size = 36, cls = '') {
  if (!u) u = { id: 'x', name: '?' };
  const fallback = `<span class="av-fallback" aria-hidden="true">${initials(u.name)}</span>`;
  const crop = avatarCropCss(u.avatar);
  const imgAttrs = crop ? ` class="cropped" style="${crop}"` : '';
  if (u.avatar && u.avatar.d) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img src="${esc(u.avatar.d)}" alt="" width="${size}" height="${size}" decoding="async" draggable="false"${imgAttrs}></span>`;
  }
  if (u.avatar && u.avatar.m) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img data-media="${u.avatar.m}" alt="" width="${size}" height="${size}" draggable="false"${imgAttrs}></span>`;
  }
  if (u.avatar && u.avatar.s) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img src="assets/img/${esc(u.avatar.s)}.avif" alt="" width="${size}" height="${size}" loading="lazy" decoding="async" draggable="false"${imgAttrs}></span>`;
  }
  return `<span class="av t${tone(u.id)} ${cls}" style="--av:${size}px" aria-hidden="true">${initials(u.name)}</span>`;
}

/* ------------------------------------------------------------------ markup */

function postCard(p, opts = {}) {
  const detail = !!opts.detail;
  const fresh = !!opts.fresh;
  const u = user(p.userId);
  const replies = repliesOf(p.id);
  const liked = state.liked.includes(p.id);
  const saved = state.bookmarked.includes(p.id);
  const likes = p.likes + (liked ? 1 : 0);
  const likeLabel = `${liked ? 'Unlike' : 'Like'} post, ${plural(likes, 'like')}`;
  const replyLabel = replies.length ? `Reply, ${plural(replies.length, 'reply')}` : 'Reply';
  const images = mediaHtml(p);

  const text = p.text ? `<div class="post-text">${esc(p.text)}</div>` : '';
  const tags = (p.tags || []).filter(Boolean).slice(0, 3);
  const tagRow = tags.length
    ? `<div class="post-tags">${tags.map((t) => `<button class="ptag" type="button" data-act="tag" data-q="#${esc(t)}" aria-label="Search #${esc(t)}">#${esc(t)}</button>`).join('')}</div>`
    : '';

  return `<article class="post${detail ? ' detail' : ''}${fresh ? ' fresh' : ''}" data-post="${p.id}" tabindex="${detail ? '-1' : '0'}">
    <header class="post-h">
      <button class="avbtn" type="button" data-act="profile" data-id="${u.id}" aria-label="Open ${esc(u.name)} profile">${av(u, 36)}</button>
      <div class="post-meta">
        <button class="pname" type="button" data-act="profile" data-id="${u.id}">${esc(u.name)}</button>
        <div class="phandle">@${esc(u.handle)} · <time datetime="${new Date(p.ts).toISOString()}" data-ts="${p.ts}">${rel(p.ts)}</time></div>
      </div>
    </header>
    ${text}
    ${images}
    ${tagRow}
    <footer class="acts" role="group" aria-label="Post actions">
      <button class="act${liked ? ' on' : ''}" type="button" data-act="like" data-id="${p.id}" aria-pressed="${liked}" aria-label="${likeLabel}" title="${liked ? 'Unlike' : 'Like'}"><span class="like-ic">${icon('heart')}</span><span data-count="like">${likes}</span></button>
      <button class="act" type="button" ${detail ? 'data-act="replyfocus"' : `data-act="open" data-id="${p.id}"`} aria-label="${replyLabel}" title="Reply">${icon('message-circle')}<span data-count="replies">${replies.length || ''}</span></button>
      <button class="act saved${saved ? ' on' : ''}" type="button" data-act="bookmark" data-id="${p.id}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from saved' : 'Save post'}" title="${saved ? 'Remove from saved' : 'Save'}">${icon('bookmark')}</button>
      <button class="act" type="button" data-act="share" data-id="${p.id}" aria-label="Share post" title="Share">${icon('share')}</button>
      ${p.userId === 'me' ? `<button class="act" type="button" data-act="post-menu" data-id="${p.id}" aria-haspopup="dialog" aria-label="Post options" title="Post options">${icon('more-horizontal')}</button>` : ''}
    </footer>
  </article>`;
}

function replyLiked(id) {
  return state.likedReplies.includes(id);
}

function replyLikeButton(reply, postId) {
  const liked = replyLiked(reply.id);
  const likes = (reply.likes || 0) + (liked ? 1 : 0);
  return `<button class="reply-act reply-like${liked ? ' on' : ''}" type="button" data-act="reply-like" data-id="${reply.id}" data-post="${postId}" aria-pressed="${liked}" aria-label="${liked ? 'Unlike' : 'Like'} comment, ${plural(likes, 'like')}" title="${liked ? 'Unlike' : 'Like'}">${icon('heart')}<span data-count="reply-like">${likes}</span></button>`;
}

function replyParentHtml(reply, postId) {
  if (!reply.parentId) return '';
  const parent = replyById(postId, reply.parentId);
  if (!parent || parent.userId === reply.userId) return '';
  return `<div class="reply-to">Replying to <b>@${esc(user(parent.userId).handle)}</b></div>`;
}

function replyHtml(reply, postId) {
  const u = user(reply.userId);
  return `<div class="reply" data-reply="${reply.id}" data-post="${postId}">
    ${av(u, 28)}
    <div class="reply-main">
      <div class="reply-head">
        <span class="reply-name">${esc(u.name)}</span>
        <span class="reply-time"><time datetime="${new Date(reply.ts).toISOString()}" data-ts="${reply.ts}">${rel(reply.ts)}</time></span>
      </div>
      <div class="reply-body" data-act="reply-to" data-id="${reply.id}" data-post="${postId}" role="button" tabindex="0" aria-label="Reply to ${esc(u.name)}">
        ${replyParentHtml(reply, postId)}
        <div class="reply-text">${esc(reply.text)}</div>
      </div>
    </div>
    <div class="reply-acts">
      ${replyLikeButton(reply, postId)}
    </div>
  </div>`;
}

function repliesHtml(postId) {
  const list = repliesOf(postId).slice().sort((a, b) => a.ts - b.ts);
  const byId = new Map(list.map((r) => [r.id, r]));
  const roots = [];
  const children = new Map();
  for (const reply of list) {
    let root = reply.parentId ? byId.get(reply.parentId) : null;
    if (!root) { roots.push(reply); continue; }
    const seen = new Set();
    while (root && root.parentId && byId.has(root.parentId) && !seen.has(root.id)) {
      seen.add(root.id);
      root = byId.get(root.parentId);
    }
    if (!root || root.id === reply.id) roots.push(reply);
    else {
      if (!children.has(root.id)) children.set(root.id, []);
      children.get(root.id).push(reply);
    }
  }
  return roots.map((root) => {
    const kids = children.get(root.id) || [];
    if (!kids.length) return replyHtml(root, postId);
    const key = threadKey(postId, root.id);
    const shown = Math.min(threadShown.get(key) || 0, kids.length);
    const open = shown > 0;
    const toggle = open
      ? `<div class="thread-actions">
          ${shown < kids.length ? `<button class="thread-link" type="button" data-act="thread-more" data-post="${postId}" data-root="${root.id}">Show more replies</button>` : ''}
          <button class="thread-link" type="button" data-act="thread-collapse" data-post="${postId}" data-root="${root.id}">Hide replies</button>
        </div>`
      : `<button class="thread-link thread-open" type="button" data-act="thread-open" data-post="${postId}" data-root="${root.id}" aria-expanded="false">${icon('chevron-right')}<span>View ${plural(kids.length, 'reply')}</span></button>`;
    return `<div class="reply-thread${open ? ' open' : ''}" data-root="${root.id}">
      ${replyHtml(root, postId)}
      ${open ? `<div class="thread-branch">
        <div class="thread-body">${kids.slice(0, shown).map((reply) => replyHtml(reply, postId)).join('')}</div>
        ${toggle}
      </div>` : toggle}
    </div>`;
  }).join('');
}

function personRow(u) {
  return `<button class="person" type="button" data-act="profile" data-id="${u.id}">
    ${av(u, 40)}
    <div class="person-main">
      <div class="person-name">${esc(u.name)}</div>
      <div class="person-sub">@${esc(u.handle)} · ${esc(u.bio)}</div>
    </div>
  </button>`;
}

function profileHead(u, count, isMe) {
  const follows = !isMe && isFollowing('me', u.id);
  return `<div class="profile-top">
    <div class="profile-id">
      <button class="profile-av" type="button" data-act="avatar" data-id="${u.id}" aria-label="View ${esc(u.name)} profile photo" title="View ${esc(u.name)} profile photo">${av(u, 76)}</button>
      <div class="profile-idtext">
        <h2 class="p-name">${esc(u.name)}</h2>
        <div class="p-handle">@${esc(u.handle)}</div>
      </div>
      ${isMe
        ? `<div class="profile-actions">
            <button class="btn ghost sm profile-edit" type="button" data-act="edit" aria-label="Edit profile"><span data-icon="pen"></span></button>
            <button class="btn ghost sm profile-settings" type="button" data-act="settings" aria-label="Settings" title="Settings">${icon('settings')}</button>
          </div>`
        : `<button class="btn sm follow-btn${follows ? ' ghost' : ''}" type="button" data-act="follow" data-id="${u.id}" data-follow-btn="${u.id}" aria-pressed="${follows}" aria-label="${follows ? 'Unfollow' : 'Follow'} ${esc(u.name)}">${follows ? `${icon('check')}Following` : 'Follow'}</button>`}
    </div>
    <div class="profile-about">
      <p class="p-bio">${esc(u.bio)}</p>
      <div class="p-joined">Joined ${esc(u.joined)}</div>
    </div>
    <div class="stats" data-stats="${u.id}">
      <div class="stat"><b>${count}</b><span>Posts</span></div>
      <button class="stat" type="button" data-act="people" data-id="${u.id}" data-kind="followers" aria-label="View followers of ${esc(u.name)}"><b data-stat="followers">${fmt(followersOf(u.id).length)}</b><span>Followers</span></button>
      <button class="stat" type="button" data-act="people" data-id="${u.id}" data-kind="following" aria-label="View people ${esc(u.name)} follows"><b data-stat="following">${fmt(followingOf(u.id).length)}</b><span>Following</span></button>
    </div>
  </div>`;
}

function photoGrid(items, showBadges = false) {
  return `<div class="grid">${items.map(({ p, im }) => {
    const n = p.images ? p.images.length : 1;
    const badge = showBadges ? `<span class="grid-badge${n > 1 ? ' multi' : ''}">${icon('image')}<span>${n}</span></span>` : '';
    return `<button type="button" data-act="open" data-id="${p.id}" aria-label="Open post, ${n === 1 ? '1 photo' : n + ' photos'}">${imgTag(im, '33vw')}${badge}</button>`;
  }).join('')}</div>`;
}

/* ------------------------------------------------------------------ toast */

let toastTimer;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2000);
}

function processShow(total) {
  const veil = $('#process-veil');
  if (!veil) return;
  const note = $('#process-note');
  if (note) note.textContent = total > 1 ? `Optimising ${total} photos on this device.` : 'Optimising one photo on this device.';
  const fill = $('#process-fill');
  if (fill) fill.style.transform = 'scaleX(0)';
  veil.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => veil.classList.add('on'));
}

function processStep(done, total) {
  const fill = $('#process-fill');
  if (fill) fill.style.transform = `scaleX(${total ? Math.min(1, done / total).toFixed(3) : 0})`;
  const note = $('#process-note');
  if (note && total > 1) note.textContent = `${Math.min(done, total)} of ${total} photos done.`;
}

function processHide() {
  const veil = $('#process-veil');
  if (!veil) return;
  veil.classList.remove('on');
  veil.setAttribute('aria-hidden', 'true');
}


/* ------------------------------------------------------------------ views */

let profileTab = 'posts';
let exploreQuery = '';
let exploreTimer = 0;
let currentTab = null;

function sortedPosts() {
  return state.posts.slice().sort((a, b) => b.ts - a.ts);
}

function feedPosts() {
  return sortedPosts().filter((p) => p.userId === 'me' || isFollowing('me', p.userId));
}

function renderFeed(freshId) {
  const list = $('#feed-list');
  const posts = feedPosts();
  list.innerHTML = posts.map((p) => postCard(p, { fresh: p.id === freshId })).join('')
    || `<div class="empty">Follow a few people to fill your feed.<br><button class="btn ghost sm empty-btn" type="button" data-act="goto-explore">Explore people</button></div>`;
  hydrate(list);
  scheduleScrollbar();
}

function parseSearch(q) {
  const tokens = q.split(/\s+/).filter(Boolean);
  const tags = tokens.filter((t) => t.startsWith('#')).map((t) => t.slice(1).toLowerCase()).filter(Boolean);
  const handles = tokens.filter((t) => t.startsWith('@')).map((t) => t.slice(1).toLowerCase()).filter(Boolean);
  const words = tokens.filter((t) => !t.startsWith('#') && !t.startsWith('@')).map((t) => t.toLowerCase());
  return { tags, handles, words };
}

const replyCount = (id) => repliesOf(id).length;

function postScore(p) {
  const hours = Math.max(.25, (Date.now() - p.ts) / 3600000);
  return (p.likes + replyCount(p.id) * 3 + 4) / Math.pow(hours + 2, .55);
}

function interleaveByUser(posts) {
  const buckets = new Map();
  for (const p of posts) {
    if (!buckets.has(p.userId)) buckets.set(p.userId, []);
    buckets.get(p.userId).push(p);
  }
  const out = [];
  let more = true;
  while (more) {
    more = false;
    for (const list of buckets.values()) {
      if (!list.length) continue;
      out.push(list.shift());
      more = true;
    }
  }
  return out;
}

function discoverPosts() {
  const followed = new Set(['me', ...followingOf('me')]);
  let pool = sortedPosts().filter((p) => !followed.has(p.userId));
  if (!pool.length) pool = sortedPosts().filter((p) => p.userId !== 'me');
  const ranked = pool.slice().sort((a, b) => postScore(b) - postScore(a) || b.ts - a.ts);
  return interleaveByUser(ranked);
}

function suggestedPeople(limit = 5) {
  const followed = new Set(followingOf('me'));
  return state.users
    .filter((u) => u.id !== 'me' && !followed.has(u.id))
    .map((u) => ({
      u,
      mutuals: followedByFriends(u.id),
      followers: followersOf(u.id).length,
      posts: state.posts.filter((p) => p.userId === u.id).length
    }))
    .filter((row) => row.posts > 0)
    .sort((a, b) => b.mutuals.length - a.mutuals.length || b.followers - a.followers || b.posts - a.posts || a.u.name.localeCompare(b.u.name))
    .slice(0, limit);
}

function suggestRow({ u, mutuals }) {
  const on = isFollowing('me', u.id);
  const by = mutuals.slice(0, 2).map((m) => esc(m.name.split(' ')[0])).join(', ');
  const note = mutuals.length
    ? `Followed by ${by}${mutuals.length > 2 ? ` +${mutuals.length - 2}` : ''}`
    : `@${esc(u.handle)} · ${esc(u.bio)}`;
  return `<div class="suggest">
    <button class="suggest-main" type="button" data-act="profile" data-id="${u.id}">
      ${av(u, 40)}
      <span class="suggest-text">
        <span class="suggest-name">${esc(u.name)}</span>
        <span class="suggest-sub">${note}</span>
      </span>
    </button>
    <button class="btn ghost sm suggest-follow" type="button" data-act="follow" data-id="${u.id}" data-follow-btn="${u.id}" aria-pressed="${on}" aria-label="${on ? 'Unfollow' : 'Follow'} ${esc(u.name)}">${on ? `${icon('check')}Following` : 'Follow'}</button>
  </div>`;
}

function searchPeople(q) {
  const { tags, handles, words } = parseSearch(q);
  if (tags.length && !handles.length && !words.length) return [];
  const rows = state.users.filter((u) => {
    const name = u.name.toLowerCase();
    const handle = u.handle.toLowerCase();
    const hay = `${name} ${handle} ${u.bio.toLowerCase()}`;
    if (handles.some((h) => !handle.includes(h) && !name.includes(h))) return false;
    return words.every((w) => hay.includes(w));
  });
  return rows.sort((a, b) => {
    const ah = a.handle.toLowerCase();
    const bh = b.handle.toLowerCase();
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const aExact = handles.some((h) => ah === h) ? 1 : 0;
    const bExact = handles.some((h) => bh === h) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    const aStart = handles.some((h) => ah.startsWith(h) || an.startsWith(h)) ? 1 : 0;
    const bStart = handles.some((h) => bh.startsWith(h) || bn.startsWith(h)) ? 1 : 0;
    if (aStart !== bStart) return bStart - aStart;
    return followersOf(b.id).length - followersOf(a.id).length || a.name.localeCompare(b.name);
  });
}

function searchPosts(q) {
  const { tags: qTags, handles, words } = parseSearch(q);
  const rows = [];
  for (const p of sortedPosts()) {
    const u = user(p.userId);
    const pTags = (p.tags || []).map((t) => t.toLowerCase());
    if (qTags.some((t) => !pTags.some((tag) => tag.startsWith(t)))) continue;
    if (handles.length && !handles.some((h) => u.handle.toLowerCase().includes(h) || u.name.toLowerCase().includes(h))) continue;
    const text = (p.text || '').toLowerCase();
    const hay = `${text} ${u.name} ${u.handle} ${pTags.join(' ')}`.toLowerCase();
    if (words.some((w) => !hay.includes(w))) continue;
    let score = 0;
    for (const t of qTags) score += pTags.includes(t) ? 14 : 10;
    for (const w of words) {
      if (text.includes(w)) score += 8;
      if (u.name.toLowerCase().includes(w) || u.handle.toLowerCase().includes(w)) score += 5;
      if (pTags.some((tag) => tag.includes(w))) score += 3;
    }
    if (handles.length) score += 20;
    score += Math.log1p(p.likes + replyCount(p.id) * 2) * 2;
    rows.push({ p, score });
  }
  return rows.sort((a, b) => b.score - a.score || b.p.ts - a.p.ts).map((row) => row.p);
}

function matchingTags(q) {
  const { tags, words } = parseSearch(q);
  const needles = [...tags, ...words];
  if (!needles.length) return [];
  const counts = new Map();
  for (const p of state.posts) for (const t of (p.tags || [])) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()]
    .filter(([t]) => needles.some((n) => t.startsWith(n) || t.includes(n)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6);
}

function renderExplore() {
  const body = $('#explore-body');
  const q = exploreQuery.trim().toLowerCase();
  if (!q) {
    const posts = sortedPosts();
    const counts = new Map();
    for (const p of posts) for (const t of (p.tags || [])) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8);
    const people = suggestedPeople(5);
    const discover = discoverPosts();
    const photos = [];
    const seen = new Set();
    for (const p of posts.slice().sort((a, b) => b.ts - a.ts)) {
      for (const im of (p.images || [])) {
        const key = im.s || im.m;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        photos.push({ p, im });
        if (photos.length >= 6) break;
      }
      if (photos.length >= 6) break;
    }
    body.innerHTML = `
      <div class="section"><h3 class="section-h">Trending</h3></div>
      <div class="tags">${tags.map(([t, n]) => `<button class="tag" type="button" data-act="tag" data-q="#${esc(t)}">#${esc(t)}<span class="tag-n">${n}</span></button>`).join('')}</div>
      ${people.length ? `<div class="section"><h3 class="section-h">People to follow</h3></div><div>${people.map(suggestRow).join('')}</div>` : ''}
      <div class="section"><h3 class="section-h">Discover</h3></div>
      <div id="explore-discover-list">${discover.slice(0, 6).map((p) => postCard(p)).join('')}</div>
      ${discover.length > 6 ? `<div class="more-wrap"><button class="btn ghost sm" type="button" data-act="explore-more" data-kind="discover" data-offset="6">Show more posts</button></div>` : ''}
      ${photos.length ? `<div class="section"><h3 class="section-h">Photos</h3></div>${photoGrid(photos, true)}` : ''}
    `;
    hydrate(body);
    scheduleScrollbar();
    return;
  }

  const { tags: qTags, handles } = parseSearch(q);
  const tags = matchingTags(q);
  const people = searchPeople(q);
  const found = searchPosts(q);
  const heading = qTags.length ? `Tagged ${qTags.map((t) => '#' + esc(t)).join(' ')}` : (handles.length ? `From @${esc(handles[0])}` : 'Posts');
  const empty = !people.length && !found.length;
  body.innerHTML = `
    ${tags.length ? `<div class="section"><h3 class="section-h">Tags</h3></div><div class="tags">${tags.map(([t, n]) => `<button class="tag" type="button" data-act="tag" data-q="#${esc(t)}">#${esc(t)}<span class="tag-n">${n}</span></button>`).join('')}</div>` : ''}
    ${people.length ? `<div class="section"><h3 class="section-h">People <span class="section-n">${people.length}</span></h3></div><div id="explore-people-list">${people.slice(0, 5).map(personRow).join('')}</div>${people.length > 5 ? `<div class="more-wrap"><button class="btn ghost sm" type="button" data-act="explore-more" data-kind="people" data-offset="5">Show more people</button></div>` : ''}` : ''}
    <div class="section"><h3 class="section-h">${heading}${found.length ? ` <span class="section-n">${found.length}</span>` : ''}</h3></div>
    ${empty ? `<p class="empty">No results for "${esc(q)}".<br>Try a name, @handle, or #tag.</p>` : `<div id="explore-search-list">${found.slice(0, 12).map((p) => postCard(p)).join('') || '<p class="empty">No matching posts.</p>'}</div>${found.length > 12 ? `<div class="more-wrap"><button class="btn ghost sm" type="button" data-act="explore-more" data-kind="search" data-offset="12">Show more posts</button></div>` : ''}`}
  `;
  hydrate(body);
  scheduleScrollbar();
}

function unreadCount(chat) {
  return messagesOf(chat.id).filter((m) => m.from === 'them' && m.ts > (chat.lastRead || 0)).length;
}

function lastMessage(chat) {
  const list = messagesOf(chat.id);
  return list.length ? list[list.length - 1] : null;
}

function renderChats() {
  const list = state.chats
    .map((c) => ({ c, last: lastMessage(c) }))
    .sort((a, b) => (b.last ? b.last.ts : 0) - (a.last ? a.last.ts : 0));

  $('#chat-list').innerHTML = list.map(({ c, last }) => {
    const u = user(c.userId);
    const n = unreadCount(c);
    const preview = last ? `${last.from === 'me' ? 'You: ' : ''}${last.text}` : 'No messages yet';
    return `<button class="chat-row${n ? ' unread' : ''}" type="button" data-act="chat" data-id="${c.id}" aria-label="Chat with ${esc(u.name)}${n ? `, ${n} unread` : ''}">
      ${av(u, 44)}
      <div class="chat-main">
        <div class="chat-top">
          <span class="chat-name">${esc(u.name)}</span>
          ${last ? `<time class="chat-time" datetime="${new Date(last.ts).toISOString()}" data-ts="${last.ts}">${rel(last.ts)}</time>` : ''}
        </div>
        <div class="chat-last">
          <span class="preview">${esc(preview)}</span>
          ${n ? `<span class="unread-count" aria-hidden="true">${n}</span>` : ''}
        </div>
      </div>
    </button>`;
  }).join('') || '<p class="empty">No conversations yet.</p>';

  updateTabUnread();
  scheduleScrollbar();
}

function profileList() {
  const posts = sortedPosts().filter((p) => p.userId === 'me');
  const saved = sortedPosts().filter((p) => state.bookmarked.includes(p.id));
  const photos = [];
  for (const p of posts) for (const im of (p.images || [])) photos.push({ p, im });

  if (profileTab === 'media') return photos.length ? photoGrid(photos) : '<p class="empty">No photos yet.</p>';
  if (profileTab === 'saved') return saved.length ? saved.map((p) => postCard(p)).join('') : '<p class="empty">Nothing saved yet. Tap the bookmark on a post to keep it here.</p>';
  return posts.length ? posts.map((p) => postCard(p)).join('') : '<p class="empty">No posts yet.</p>';
}

function renderProfile() {
  const me = state.me;
  const posts = sortedPosts().filter((p) => p.userId === 'me');
  const body = $('#profile-body');
  body.innerHTML = `
    ${profileHead(me, posts.length, true)}
    <div class="seg three">
      <button class="${profileTab === 'posts' ? 'on' : ''}" type="button" data-act="ptab" data-v="posts">Posts</button>
      <button class="${profileTab === 'media' ? 'on' : ''}" type="button" data-act="ptab" data-v="media">Media</button>
      <button class="${profileTab === 'saved' ? 'on' : ''}" type="button" data-act="ptab" data-v="saved" aria-label="Saved posts, only visible to you" title="Only visible to you">${icon('lock')}<span>Saved</span></button>
    </div>
    <div id="profile-list">${profileList()}</div>
  `;
  injectIcons(body);
  hydrate(body);
  scheduleScrollbar();
}

function setProfileTab(next) {
  if (next === profileTab) return;
  profileTab = next;
  ui.profileTab = next;
  saveUI();
  const body = $('#profile-body');
  const list = $('#profile-list');
  if (!body || !list) { renderProfile(); return; }
  $$('.seg button', body).forEach((b) => b.classList.toggle('on', b.dataset.v === next));
  list.innerHTML = profileList();
  injectIcons(list);
  hydrate(list);
  swapIn(list);
  scheduleScrollbar();
}

function updateTabUnread() {
  const total = state.chats.reduce((n, c) => n + unreadCount(c), 0);
  for (const id of ['tab-unread', 'side-unread']) {
    const dot = $('#' + id);
    if (dot) dot.hidden = total === 0;
  }
}


function updateTimes() {
  if (document.hidden) return;
  $$('time[data-ts]').forEach((el) => {
    const v = rel(Number(el.dataset.ts));
    if (el.textContent !== v) el.textContent = v;
  });
}

/* ------------------------------------------------------------------ keyboard */

function activePostEl() {
  const el = document.activeElement;
  const post = el && el.closest && el.closest('.post[data-post]');
  return post && post.closest('.view') ? post : null;
}

function viewPosts() {
  const view = viewEl(currentTab);
  return view ? $$('.post[data-post]', view) : [];
}

function firstVisibleIndex(list, view) {
  const top = view.getBoundingClientRect().top;
  const i = list.findIndex((el) => el.getBoundingClientRect().bottom > top + 8);
  return i < 0 ? 0 : i;
}

function lastVisibleIndex(list, view) {
  const bottom = view.getBoundingClientRect().bottom;
  let i = list.length - 1;
  while (i > 0 && list[i].getBoundingClientRect().top > bottom - 8) i -= 1;
  return i;
}

function stepPost(dir) {
  const view = viewEl(currentTab);
  const list = viewPosts();
  if (!view || !list.length) return;

  const current = activePostEl();
  const from = current ? list.indexOf(current) : -1;
  const index = from < 0
    ? (dir > 0 ? firstVisibleIndex(list, view) : lastVisibleIndex(list, view))
    : Math.min(list.length - 1, Math.max(0, from + dir));

  const next = list[index];
  if (!next) return;
  $$('.post.is-focus').forEach((el) => el.classList.remove('is-focus'));
  next.classList.add('is-focus');
  next.focus({ preventScroll: true });
  next.scrollIntoView({ block: 'nearest' });
}

function openShortcuts() {
  mountLayer(`
    ${layerHead('Keyboard', '', 'x')}
    <div class="layer-body">
      <div class="setting-h">Browse</div>
      <dl class="keys">
        <div><dt><kbd>J</kbd><kbd>K</kbd></dt><dd>Next or previous post</dd></div>
        <div><dt><kbd>Enter</kbd></dt><dd>Open the focused post</dd></div>
        <div><dt><kbd>L</kbd></dt><dd>Like the focused post</dd></div>
        <div><dt><kbd>B</kbd></dt><dd>Bookmark the focused post</dd></div>
        <div><dt><kbd>R</kbd></dt><dd>Reply to the focused post</dd></div>
        <div><dt><kbd>S</kbd></dt><dd>Share the focused post</dd></div>
      </dl>
      <div class="setting-h">Anywhere</div>
      <dl class="keys">
        <div><dt><kbd>N</kbd></dt><dd>New post</dd></div>
        <div><dt><kbd>/</kbd></dt><dd>Search</dd></div>
        <div><dt><kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd></dt><dd>Feed, Explore, Chat, Profile</dd></div>
        <div><dt><kbd>,</kbd></dt><dd>Settings</dd></div>
        <div><dt><kbd>Esc</kbd></dt><dd>Go back</dd></div>
        <div><dt><kbd>?</kbd></dt><dd>This list</dd></div>
      </dl>
    </div>
  `, { cls: 'settings-layer', descriptor: { type: 'shortcuts' } });
}

function renderAll() {
  renderFeed();
  renderExplore();
  renderChats();
  renderProfile();
  updateTabUnread();
  updateTimes();
}

/* ------------------------------------------------------------------ layers */

const layersRoot = $('#layers');
const viewsRoot = $('#views');
const scrollIndicator = $('#scroll-indicator');
const scrollThumb = $('.scroll-thumb', scrollIndicator);
const webkitScroll = typeof CSS !== 'undefined' && CSS.supports && CSS.supports('selector(::-webkit-scrollbar)');
let layers = [];
let restoringLayers = false;
let confirmAction = null;
let activeThread = null;
let focusReturn = null;
let keyboardMode = false;
let silentHistory = false;
let restoreAnimate = false;
let navIndex = 0;
let navApplying = false;
let navRebuilding = false;
let tabTimer = 0;
let tabTransitioning = false;

const isTextInput = (el) => !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

const HAS_VK = typeof navigator !== 'undefined' && 'virtualKeyboard' in navigator;
let viewportRaf = 0;
let typingTimer = 0;
let currentKeyboardHeight = 0;
let keyboardTargetLift = 0;
let keyboardExtra = 0;
let keyboardRemembered = 0;
let keyboardSettleUntil = 0;
let keyboardIdleTimer = 0;
let keyboardPredictUntil = 0;
let keyboardPadding = 0;
let keyboardPaddingHold = false;
let replyRevealTimer = 0;
let vkHeight = 0;
let fullHeight = window.innerHeight;

const KB_MIN = 60;

function activeComposer() {
  const focused = document.activeElement;
  const direct = focused && focused.closest && focused.closest('.replybar, .composer, .compose-foot');
  if (direct) return direct;
  for (let i = layers.length - 1; i >= 0; i--) {
    const found = layers[i].el.querySelector('.replybar, .composer, .compose-foot');
    if (found) return found;
  }
  return null;
}

let composerHeightTimer = 0;

function applyComposerHeight() {
  composerHeightTimer = 0;
  const composer = activeComposer();
  const root = document.documentElement;
  if (!composer) {
    root.style.removeProperty('--composer-height');
    return;
  }
  // Keep the reply bar height stable while the keyboard is open or a post
  // submit scroll is pending. The chip collapsing must not shrink the scroll
  // padding and clamp the thread.
  if ((keyboardPaddingHold || currentKeyboardHeight > 0) && composer.classList.contains('replybar')) return;
  const height = Math.round(composer.getBoundingClientRect().height);
  if (height > 0) {
    const next = height + 'px';
    if (root.style.getPropertyValue('--composer-height') !== next) root.style.setProperty('--composer-height', next);
  }
}

/* The chip transition changes the bar height over a few frames. Debounce the
   root custom property so the padding is not recalculated every frame. */
function syncComposerHeight() {
  clearTimeout(composerHeightTimer);
  composerHeightTimer = setTimeout(applyComposerHeight, 90);
}

/* Reveal with native smooth scrolling on open. The return uses a compositor
   track with the bar curve, a little longer and a small delay. */
let replyScrollAnim = null;
let replyScrollAnimating = false;
let replyScrollSaveTimer = 0;

function endReplyScrollAnim() {
  replyScrollAnimating = false;
  clearTimeout(replyScrollSaveTimer);
  replyScrollSaveTimer = 0;
  saveUI();
}

/* Animate the thread on the compositor with the same duration and curve as
   the bar. The scroll position is committed first, and a transform on the
   track makes the visual start where it was. */
function scrollReplyTo(scroller, to, mode = 'open') {
  const track = scroller.querySelector('.detail-track');
  const from = scroller.scrollTop;
  if (Math.abs(to - from) < 0.5) return;
  if (mode === 'open') {
    if (replyScrollAnim) {
      replyScrollAnim.cancel();
      replyScrollAnim = null;
      endReplyScrollAnim();
    }
    if (track) {
      track.style.transform = '';
      track.style.willChange = '';
    }
    scroller.scrollTo({ top: to, behavior: reducedMotion() ? 'auto' : 'smooth' });
    return;
  }
  if (!track || reducedMotion() || typeof track.animate !== 'function') {
    scroller.scrollTop = to;
    return;
  }
  const android = document.documentElement.classList.contains('android');
  const close = mode === 'close';
  const banner = mode === 'banner';
  // The thread trails the bar by a few milliseconds and takes a little
  // longer, so it follows the field instead of being welded to it.
  const duration = banner ? 180 : (android ? (close ? 240 : 340) : (close ? 220 : 260));
  const delay = banner ? 0 : (android ? 20 : 15);
  const easing = banner
    ? 'cubic-bezier(.22, .78, .2, 1)'
    : (android
      ? (close ? 'cubic-bezier(.3, .3, .2, 1)' : 'cubic-bezier(.2, 0, 0, 1)')
      : 'cubic-bezier(.22, .78, .2, 1)');
  if (replyScrollAnim) {
    replyScrollAnim.cancel();
    replyScrollAnim = null;
  }
  const delta = to - from;
  track.style.willChange = 'transform';
  track.style.transform = `translate3d(0, ${delta}px, 0)`;
  replyScrollAnimating = true;
  clearTimeout(replyScrollSaveTimer);
  replyScrollSaveTimer = setTimeout(endReplyScrollAnim, duration + delay + 150);
  scroller.scrollTop = to;
  const anim = track.animate(
    [{ transform: `translate3d(0, ${delta}px, 0)` }, { transform: 'translate3d(0, 0, 0)' }],
    { duration, delay, easing }
  );
  replyScrollAnim = anim;
  anim.onfinish = () => {
    if (replyScrollAnim === anim) replyScrollAnim = null;
    track.style.transform = '';
    track.style.willChange = '';
    endReplyScrollAnim();
  };
}

/* Keep the comment being answered a fixed distance above the bar on every
   keyboard frame. It starts and ends with the transform, so the page rides
   with the textbox instead of scrolling after it. */
function followReplyTarget(lift) {
  const composer = activeComposer();
  if (!composer || !composer.classList.contains('replybar')) return;
  const layer = composer.closest('.layer');
  if (!layer) return;
  const entry = layers.find((e) => e.el === layer);
  if (!entry || !entry.replyTo || !entry.replyBarFinal) return;
  const scroller = layer.querySelector('.layer-body');
  if (!scroller) return;
  const node = layer.querySelector(`.reply[data-reply="${entry.replyTo.id}"], .comment-item[data-reply="${entry.replyTo.id}"]`);
  if (!node) return;
  // Do not scroll into space that the keyboard padding has not reserved yet.
  if (lift > 0 && keyboardPadding + 24 < lift) return;
  if (lift > 0 && !entry.replyScrollSession) {
    entry.replyScrollSession = true;
    entry.replyScrollBase = scroller.scrollTop;
    entry.replyScrollUser = false;
    if (!entry.replyScrollWatch) {
      const mark = () => { entry.replyScrollUser = true; };
      entry.replyScrollMark = mark;
      entry.replyScrollWatch = true;
      scroller.addEventListener('wheel', mark, { passive: true });
      scroller.addEventListener('touchmove', mark, { passive: true });
    }
  }
  const barTop = lift > 0 ? window.innerHeight - lift - entry.replyBarFinal : composer.getBoundingClientRect().top;
  const topEdge = scroller.getBoundingClientRect().top + 8;
  const bottomEdge = barTop - 12;
  const nr = node.getBoundingClientRect();
  const delta = nr.bottom > bottomEdge ? nr.bottom - bottomEdge : (nr.top < topEdge ? nr.top - topEdge : 0);
  const max = scroller.scrollHeight - scroller.clientHeight;
  const to = Math.max(0, Math.min(max, scroller.scrollTop + delta));
  scrollReplyTo(scroller, to);
}

function returnReplyScroll() {
  const composer = activeComposer();
  if (!composer || !composer.classList.contains('replybar')) return;
  const layer = composer.closest('.layer');
  const entry = layers.find((e) => e.el === layer);
  if (!entry || !entry.replyTo) return;
  const scroller = layer.querySelector('.layer-body');
  if (!scroller) return;

  if (entry.replyScrollWatch) {
    scroller.removeEventListener('wheel', entry.replyScrollMark);
    scroller.removeEventListener('touchmove', entry.replyScrollMark);
    entry.replyScrollWatch = false;
    entry.replyScrollMark = null;
  }
  entry.replyScrollSession = false;

  // The padding is still at the open value while the bar drops. Work out the
  // room that will exist once it is released so the return lands inside it.
  const openMax = scroller.scrollHeight - scroller.clientHeight;
  const closedMax = Math.max(0, openMax - Math.max(0, keyboardPadding));
  let to;
  if (entry.replyScrollUser) {
    entry.replyScrollUser = false;
    entry.replyScrollBase = null;
    // A real scroll is kept, clamped to the space that will remain.
    to = Math.min(scroller.scrollTop, closedMax);
  } else if (entry.replyScrollBase == null) {
    to = Math.min(scroller.scrollTop, closedMax);
  } else {
    to = Math.min(entry.replyScrollBase, closedMax);
  }
  scrollReplyTo(scroller, to, 'close');
}

function settleChatView() {
  const composer = activeComposer();
  const layer = composer && composer.closest('.layer.thread');
  if (!layer) return;
  const scroller = layer.querySelector('.msgs');
  if (!scroller) return;
  if (scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 160) {
    scroller.scrollTop = scroller.scrollHeight;
  }
}

/* Move the bars with an inline transform. A CSS transition does the
   interpolation on the compositor, so a busy main thread cannot turn the
   motion into a slideshow, and a late or coarse IME report cannot jump. */
let keyboardBars = [];

function cacheKeyboardBars() {
  keyboardBars = $$('.replybar, .composer, .compose-foot');
}

function applyKeyboardLift(value) {
  const lift = value > 0.05 ? Math.round(value * 10) / 10 : 0;
  const transform = lift ? `translate3d(0, ${-lift}px, 0)` : '';
  if (!keyboardBars.length) cacheKeyboardBars();
  for (const el of keyboardBars) el.style.transform = transform;
}

function scheduleKeyboardSettle() {
  document.documentElement.classList.add('kb-moving');
  clearTimeout(keyboardIdleTimer);
  keyboardIdleTimer = setTimeout(() => {
    const target = keyboardTargetLift;
    const padChanged = keyboardPadding !== target;
    document.documentElement.classList.remove('kb-moving');
    document.documentElement.style.setProperty('--keyboard-extra', target ? keyboardExtra + 'px' : '0px');
    if (!(target === 0 && keyboardPaddingHold)) {
      keyboardPadding = target;
      if (padChanged) document.documentElement.style.setProperty('--keyboard-px', target + 'px');
    }
    if (target) {
      settleChatView();
      if (padChanged) followReplyTarget(target);
    }
  }, 330);
}

function keyboardExtraFor(bar) {
  if (!bar) return 0;
  // The field must clear the IME toolbar on Android, and the prediction must
  // not add a gap when the home indicator already provides one.
  const pad = parseFloat(getComputedStyle(bar).paddingBottom) || 0;
  const gap = document.documentElement.classList.contains('android') ? 40 : 20;
  return Math.max(0, Math.round(gap - pad));
}

function setKeyboardTarget(raw, predicted = false) {
  // A real inset starts below the 60px viewport-noise threshold used by the
  // visualViewport fallback, so accept any visible height here.
  let height = raw > 2 ? Math.round(raw) : 0;
  if (height > 0 && performance.now() < keyboardSettleUntil && !isTextInput(document.activeElement)) height = 0;
  // The prediction already started the motion. Mid-animation reports are
  // intermediate positions, not the final height, so they must not pull the
  // bar backwards. The last report after the window still corrects it.
  if (height > 0 && !predicted && performance.now() < keyboardPredictUntil) return;
  // Ignore one or two pixels of IME noise so a settled bar is not nudged.
  if (height > 0 && currentKeyboardHeight > 0 && Math.abs(height - currentKeyboardHeight) <= 2) return;
  if (height > KB_MIN) keyboardRemembered = height;
  if (height === currentKeyboardHeight && (height === 0 || keyboardTargetLift === height + keyboardExtra)) return;
  const opening = height > 0 && currentKeyboardHeight === 0;
  const closing = height === 0 && currentKeyboardHeight > 0;
  currentKeyboardHeight = height;
  if (opening) {
    keyboardExtra = keyboardExtraFor(activeComposer());
    document.documentElement.style.setProperty('--keyboard-extra', keyboardExtra + 'px');
    keyboardPredictUntil = predicted ? performance.now() + 330 : 0;
  }
  keyboardTargetLift = height > 0 ? height + keyboardExtra : 0;
  const root = document.documentElement;
  root.classList.toggle('kb-open', height > 0);
  if (opening) {
    keyboardPadding = keyboardTargetLift;
    root.style.setProperty('--keyboard-px', keyboardPadding + 'px');
  }
  if (!height) fullHeight = Math.max(fullHeight, window.innerHeight);
  if (opening || closing) {
    syncComposerHeight();
    cacheKeyboardBars();
  }
  applyKeyboardLift(keyboardTargetLift);
  scheduleKeyboardSettle();
  if (height > 0) followReplyTarget(keyboardTargetLift);
  else if (closing) returnReplyScroll();
}

function envKeyboardHeight() {
  const probe = $('#kb-probe');
  return probe ? Math.round(probe.getBoundingClientRect().height) : 0;
}

function keyboardLift(rect) {
  if (!rect || !(Number(rect.height) > 0)) return 0;
  const base = Math.max(fullHeight, window.innerHeight);
  const top = Number.isFinite(rect.top) ? rect.top : base - (Number(rect.height) || 0);
  return Math.max(0, Math.round(base - top));
}

function syncKeyboardFromViewport() {
  if (performance.now() < keyboardSettleUntil && !isTextInput(document.activeElement)) {
    setKeyboardTarget(0);
    return;
  }
  // Chromium reports the keyboard geometry as it animates. That is the
  // closest thing to the native inset, so it wins when present.
  if (HAS_VK && navigator.virtualKeyboard) {
    const rect = navigator.virtualKeyboard.boundingRect;
    if (rect && rect.height > 0) {
      vkHeight = keyboardLift(rect);
    } else {
      vkHeight = 0;
    }
    if (vkHeight > 2) {
      setKeyboardTarget(vkHeight);
      return;
    }
  }
  const envHeight = envKeyboardHeight();
  if (envHeight > 2) {
    setKeyboardTarget(envHeight);
    return;
  }
  const vv = window.visualViewport;
  if (!vv) return;
  // iOS can shrink window.innerHeight with the keyboard. The saved full
  // height is the stable layout baseline for the keyboard inset.
  const baseline = Math.max(fullHeight, window.innerHeight);
  const raw = Math.max(0, baseline - vv.height - (vv.offsetTop || 0));
  setKeyboardTarget(raw > KB_MIN ? raw : 0);
}

function syncViewport() {
  if (viewportRaf) return;
  viewportRaf = requestAnimationFrame(() => {
    viewportRaf = 0;
    const focused = isTextInput(document.activeElement);
    document.documentElement.classList.toggle('typing', focused);
    syncKeyboardFromViewport();
  });
}

function settleKeyboard() {
  if (isTextInput(document.activeElement)) return;
  const stuck = window.innerHeight < fullHeight - 60;
  if (!stuck && currentKeyboardHeight === 0) return;
  keyboardSettleUntil = performance.now() + 500;
  vkHeight = 0;
  const root = document.documentElement;
  root.classList.add('kb-recalc');
  void root.offsetHeight;
  root.classList.remove('kb-recalc');
  window.scrollTo(0, 0);
  setKeyboardTarget(0);
  setTimeout(() => {
    if (!isTextInput(document.activeElement)) setKeyboardTarget(0);
  }, 150);
}

function initViewport() {
  document.documentElement.classList.toggle('android', /Android/i.test(navigator.userAgent));
  const vv = window.visualViewport;
  const isComposer = (el) => !!(el && el.closest && el.closest('.replybar, .composer, .compose-foot, .compose-area'));

  if (HAS_VK && navigator.virtualKeyboard) {
    try { navigator.virtualKeyboard.overlaysContent = true; } catch (e) {}
    const readKeyboard = (e) => {
      const rect = (e && e.target && e.target.boundingRect) || navigator.virtualKeyboard.boundingRect;
      vkHeight = keyboardLift(rect);
      setKeyboardTarget(vkHeight > 2 ? vkHeight : 0);
    };
    navigator.virtualKeyboard.addEventListener('geometrychange', readKeyboard);
    readKeyboard();
  }
  if (vv) {
    vv.addEventListener('resize', () => {
      syncKeyboardFromViewport();
      syncViewport();
    }, { passive: true });
    vv.addEventListener('scroll', () => {
      syncKeyboardFromViewport();
      syncViewport();
      if (window.scrollY || window.scrollX) window.scrollTo(0, 0);
    }, { passive: true });
  }

  addEventListener('resize', () => {
    if (!currentKeyboardHeight && !isTextInput(document.activeElement) && performance.now() >= keyboardSettleUntil && (!vv || vv.height >= window.innerHeight - 2)) {
      fullHeight = window.innerHeight;
    }
    syncViewport();
  }, { passive: true });
  addEventListener('orientationchange', () => setTimeout(() => {
    keyboardRemembered = 0;
    if (!currentKeyboardHeight && !isTextInput(document.activeElement)) fullHeight = window.innerHeight;
    syncViewport();
  }, 120));

  // The VirtualKeyboard env can drive the composer even when the JS geometry
  // path is unavailable. Read it through a probe so kb-open and the padding
  // stay in sync with the actual keyboard inset.
  const probe = $('#kb-probe');
  let envKeyboard = 0;
  if (probe && typeof ResizeObserver !== 'undefined') {
    const readProbe = () => {
      const height = Math.round(probe.getBoundingClientRect().height);
      if (height > 2) {
        envKeyboard = height;
        setKeyboardTarget(height);
      } else if (envKeyboard > 0) {
        envKeyboard = 0;
        setKeyboardTarget(0);
      }
    };
    new ResizeObserver(readProbe).observe(probe);
    readProbe();
  }

  document.addEventListener('focusin', (e) => {
    if (isComposer(e.target)) requestAnimationFrame(() => window.scrollTo(0, 0));
  }, true);
  document.addEventListener('touchstart', (e) => {
    if (isComposer(e.target)) requestAnimationFrame(() => window.scrollTo(0, 0));
  }, { passive: true, capture: true });

  const onFocus = (e) => {
    if (!isTextInput(e.target)) return;
    document.documentElement.classList.add('typing');
    if (isComposer(e.target)) {
      requestAnimationFrame(() => window.scrollTo(0, 0));
      // Start the lift on the same frame as the focus so the bar moves with
      // the IME instead of waiting for the first geometry report.
      if (currentKeyboardHeight === 0 && keyboardRemembered > KB_MIN && matchMedia('(pointer: coarse)').matches) {
        setKeyboardTarget(keyboardRemembered, true);
      }
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      syncKeyboardFromViewport();
      syncComposerHeight();
    }, 260);
  };
  const onBlur = () => {
    clearTimeout(typingTimer);
    requestAnimationFrame(() => {
      if (isTextInput(document.activeElement)) return;
      document.documentElement.classList.remove('typing');
      vkHeight = 0;
      keyboardSettleUntil = performance.now() + 280;
      setKeyboardTarget(0);
    });
    typingTimer = setTimeout(() => {
      if (isTextInput(document.activeElement)) return;
      settleKeyboard();
    }, 200);
  };
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onBlur);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
  document.addEventListener('pointerup', () => {
    setTimeout(() => {
      const el = document.activeElement;
      if (isTextInput(el)) onFocus({ target: el });
      else onBlur();
    }, 50);
  }, true);
  syncViewport();
  syncComposerHeight();
}

function bindKeyboard() {
  // Keyboard positioning lives in initViewport. Layers only need to keep their
  // own scroll position, which the composer padding and focus reveal handle.
  return () => {};
}

/* Keep the page behind a layer out of the tab order without blocking the
   sidebar, which stays usable for switching views. */
function syncInert() {
  const blocked = layers.length > 0;
  $$('.view').forEach((v) => {
    const active = v.dataset.view === currentTab;
    v.classList.toggle('is-active', active);
    v.setAttribute('aria-hidden', String(!active));
    v.inert = blocked || !active;
  });
  const bar = $('.tabbar');
  if (bar) bar.inert = blocked;
  layers.forEach((entry, i) => { entry.el.inert = i < layers.length - 1; });
  scheduleScrollbar();
  scheduleScrollbarSoon();
}

let scrollRaf = 0;
let scrollbarTimer = 0;
let scrollDrag = null;

function scheduleScrollbar() {
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    updateScrollbar();
  });
}

function scheduleScrollbarSoon() {
  clearTimeout(scrollbarTimer);
  scrollbarTimer = setTimeout(scheduleScrollbar, 340);
}

function activeScroller() {
  if (layers.length) {
    const top = layers[layers.length - 1].el;
    return top.querySelector('.layer-body, .msgs') || null;
  }
  return currentTab ? viewEl(currentTab) : null;
}

function updateScrollbar() {
  if (tabTransitioning || !document.documentElement.classList.contains('custom-scroll')) {
    scrollIndicator.classList.remove('on');
    return;
  }
  const scroller = activeScroller();
  if (!scroller) {
    scrollIndicator.classList.remove('on');
    return;
  }
  const scrollHeight = scroller.scrollHeight;
  const clientHeight = scroller.clientHeight;
  if (scrollHeight <= clientHeight + 1 || clientHeight < 40) {
    scrollIndicator.classList.remove('on');
    return;
  }

  const viewRect = viewsRoot.getBoundingClientRect();
  const scrollerRect = scroller.getBoundingClientRect();
  const top = scrollerRect.top - viewRect.top;
  const height = scrollerRect.height;
  const thumbHeight = Math.max(28, height * clientHeight / scrollHeight);
  const maxTop = Math.max(0, height - thumbHeight);
  const progress = scroller.scrollTop / Math.max(1, scrollHeight - clientHeight);

  scrollIndicator.style.top = top + 'px';
  scrollIndicator.style.height = height + 'px';
  scrollThumb.style.height = thumbHeight + 'px';
  scrollThumb.style.transform = `translateY(${Math.min(maxTop, Math.max(0, progress * maxTop))}px)`;
  scrollIndicator.classList.add('on');
}

function syncScrollMode() {
  const on = webkitScroll && innerWidth >= 900;
  document.documentElement.classList.toggle('custom-scroll', on);
  if (!on) {
    scrollIndicator.classList.remove('on');
    scrollIndicator.style.top = '';
    scrollIndicator.style.height = '';
    scrollThumb.style.height = '';
    scrollThumb.style.transform = '';
  } else {
    scheduleScrollbar();
  }
}

function restoreFocus() {
  const el = focusReturn;
  focusReturn = null;
  if (el && el.isConnected && typeof el.focus === 'function') {
    el.focus({ preventScroll: true });
    if (keyboardMode && el.matches && el.matches('.post[data-post]')) el.classList.add('is-focus');
  }
}

function captureLayers() {
  const out = [];
  for (const entry of layers) {
    if (!entry.descriptor) continue;
    const d = { ...entry.descriptor };
    if (entry.capture) Object.assign(d, entry.capture());
    if (entry.scrollEl && entry.scrollEl.scrollTop > 0) d.scroll = Math.round(entry.scrollEl.scrollTop);
    out.push(d);
  }
  return out.slice(0, 8);
}

function restoreLayers(list, opts = {}) {
  if (!Array.isArray(list) || !list.length) return;
  const silent = !!opts.silent;
  const animate = !!opts.animate;
  restoringLayers = true;
  restoreAnimate = animate;
  if (silent) silentHistory = true;
  if (!animate) layersRoot.classList.add('instant');
  try {
    for (const d of list) {
      if (!d || typeof d.type !== 'string') continue;
      const before = layers.length;
      try {
        switch (d.type) {
          case 'profile':
            if (!d.id || d.id === 'me' || !knownUser(d.id)) continue;
            openOtherProfile(d.id);
            break;
          case 'people':
            if (!d.id || !knownUser(d.id)) continue;
            openPeopleList(d.id, d.kind === 'following' ? 'following' : 'followers');
            break;
          case 'post':
            if (!postById(d.id)) continue;
            openPost(d.id);
            break;
          case 'avatar':
            if (!d.id || !knownUser(d.id)) continue;
            openAvatarView(d.id);
            break;
          case 'chat':
            if (!state.chats.some((c) => c.id === d.id)) continue;
            openChat(d.id);
            break;
          case 'settings':
            openSettings();
            break;
          case 'shortcuts':
            openShortcuts();
            break;
          case 'saved':
            openSavedPosts();
            break;
          case 'liked':
            openLikedPosts();
            break;
          case 'comments':
            openMyComments();
            break;
          case 'compose':
            openCompose(d);
            break;
          case 'edit':
            openEdit(d);
            break;
          case 'crop':
            openCompose(d);
            openCropEditor(d.index || 0);
            break;
          case 'confirm':
            openConfirm(d.kind || 'reset');
            break;
        }
      } catch (e) {
        continue;
      }
      if (layers.length === before) continue;
      const entry = layers[layers.length - 1];
      if (d.q) {
        const input = $('.people-search .field', entry.el);
        if (input) {
          input.value = d.q;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (d.draft) {
        const field = $('input.field', entry.el);
        if (field) field.value = d.draft;
      }
      if (d.scroll) {
        requestAnimationFrame(() => {
          if (entry.scrollEl) entry.scrollEl.scrollTop = d.scroll;
        });
      }
    }
  } finally {
    restoringLayers = false;
    restoreAnimate = false;
    if (silent) silentHistory = false;
    replaceNav();
    if (!animate) requestAnimationFrame(() => layersRoot.classList.remove('instant'));
    saveUI();
  }
}

function layerKey(d) {
  return d ? `${d.type}|${d.id || ''}|${d.kind || ''}` : '';
}

function navSnapshot(index = navIndex, layerList) {
  return {
    koinara: 2,
    index,
    tab: currentTab || ui.tab || 'feed',
    layers: layerList || captureLayers(),
    scrolls: { ...ui.scrolls },
    explore: ui.explore || '',
    profileTab: ui.profileTab || 'posts'
  };
}

function replaceNav() {
  if (navApplying || navRebuilding) return;
  try { history.replaceState(navSnapshot(navIndex), ''); } catch (e) {}
}

function pushNav() {
  if (navApplying || navRebuilding) return;
  navIndex += 1;
  try { history.pushState(navSnapshot(navIndex), ''); } catch (e) {}
}

function resetNav() {
  navIndex = 0;
  try { history.replaceState(navSnapshot(0, []), ''); } catch (e) {}
}

function rebuildNav() {
  navRebuilding = true;
  const full = captureLayers();
  navIndex = 0;
  try { history.replaceState(navSnapshot(0, []), ''); } catch (e) {}
  for (let i = 1; i <= full.length; i += 1) {
    navIndex = i;
    try { history.pushState(navSnapshot(i, full.slice(0, i)), ''); } catch (e) {}
  }
  navIndex = full.length;
  navRebuilding = false;
}

function syncHistory(target, opts = {}) {
  const want = Array.isArray(target) ? target : [];
  const animate = opts.animate !== false;
  const current = captureLayers();
  let common = 0;
  while (common < current.length && common < want.length && layerKey(current[common]) === layerKey(want[common])) common += 1;

  while (layers.length > common) closeVisual(layers.pop(), !animate);
  if (want.length > common) restoreLayers(want.slice(common), { silent: true, animate });

  syncInert();
  if (layers.length) layers[layers.length - 1].el.focus({ preventScroll: true });
  else {
    confirmAction = null;
    activeThread = null;
    restoreFocus();
  }
  saveUI();
}

function applyNav(snap, direction) {
  if (!snap || typeof snap !== 'object') return;
  navApplying = true;
  try {
    if (snap.scrolls && typeof snap.scrolls === 'object') ui.scrolls = { ...ui.scrolls, ...snap.scrolls };
    if (typeof snap.explore === 'string') {
      const changed = snap.explore !== ui.explore;
      ui.explore = snap.explore;
      exploreQuery = snap.explore;
      const input = $('#explore-search');
      if (input) input.value = snap.explore;
      if (changed && (snap.tab === 'explore' || currentTab === 'explore')) renderExplore();
    }
    if (snap.profileTab && snap.profileTab !== ui.profileTab) {
      ui.profileTab = snap.profileTab;
      profileTab = snap.profileTab;
      if (snap.tab === 'profile' || currentTab === 'profile') renderProfile();
    }
    if (snap.tab && snap.tab !== currentTab) {
      switchTab(snap.tab, {
        keepLayers: true,
        animate: true,
        direction,
        scroll: snap.scrolls ? snap.scrolls[snap.tab] : undefined
      });
    } else if (snap.tab) {
      const view = viewEl(snap.tab);
      if (view && snap.scrolls) view.scrollTop = snap.scrolls[snap.tab] || 0;
    }
    syncHistory(snap.layers || [], { animate: true });
  } finally {
    navApplying = false;
    saveUI();
  }
}

function mountLayer(html, opts = {}) {
  if (!layers.length) focusReturn = document.activeElement;

  const el = document.createElement('div');
  el.className = 'layer' + (opts.up ? ' up' : '') + (opts.cls ? ' ' + opts.cls : '');
  el.tabIndex = -1;
  el.innerHTML = html;
  layersRoot.append(el);

  const entry = { el, cleanup: null, descriptor: opts.descriptor || null, capture: opts.capture || null, scrollEl: null };
  const keyboard = bindKeyboard(el);
  entry.composer = el.querySelector('.replybar, .composer, .compose-foot');
  if (entry.composer && keyboardTargetLift > 0) {
    entry.composer.style.transform = `translate3d(0, ${-Math.round(keyboardTargetLift)}px, 0)`;
  }
  if (entry.composer && typeof ResizeObserver !== 'undefined') {
    entry.composerObserver = new ResizeObserver(() => syncComposerHeight());
    entry.composerObserver.observe(entry.composer);
  }
  entry.cleanup = () => {
    if (entry.composerObserver) {
      entry.composerObserver.disconnect();
      entry.composerObserver = null;
    }
    if (opts.onClose) opts.onClose();
    keyboard();
  };

  entry.scrollEl = el.querySelector('.layer-body, .msgs');
  if (entry.scrollEl) {
    entry.scrollEl.addEventListener('scroll', () => {
      if (!restoringLayers && !replyScrollAnimating) saveUI();
    }, { passive: true });
  }

  layers.push(entry);
  syncInert();
  const shouldPush = !silentHistory;
  if (shouldPush) {
    // Let the caller finish wiring the layer before its capture() runs.
    queueMicrotask(() => {
      if (entry.el.isConnected && layers.includes(entry)) pushNav();
    });
  }
  injectIcons(el);
  hydrate(el);
  void el.offsetHeight;
  if (restoringLayers && !restoreAnimate) {
    el.classList.add('open');
    if (!opts.noFocus) el.focus({ preventScroll: true });
  } else {
    requestAnimationFrame(() => {
      el.classList.add('open');
      if (!opts.noFocus) el.focus({ preventScroll: true });
    });
  }
  saveUI();
  return entry;
}

function closeVisual(entry, immediate = false) {
  entry.el.classList.remove('open');
  entry.el.classList.add('closing');
  if (entry.cleanup) {
    entry.cleanup();
    entry.cleanup = null;
  }
  syncComposerHeight();
  const done = () => {
    entry.el.remove();
    if (entry.afterClose) {
      entry.afterClose();
      entry.afterClose = null;
    }
  };
  if (immediate) done();
  else setTimeout(done, entry.closeMs || (matchMedia('(min-width: 900px)').matches ? 380 : 330));
}

function closeAllLayers({ animate = true, restore = true } = {}) {
  if (!layers.length) return false;
  while (layers.length) closeVisual(layers.pop(), !animate);
  confirmAction = null;
  activeThread = null;
  syncInert();
  if (restore) restoreFocus();
  saveUI();
  return true;
}

/* Used by sign-out and reset: clear the page and start a fresh history entry. */
function clearLayers({ animate = false, restore = true } = {}) {
  closeAllLayers({ animate, restore });
  resetNav();
}

function layerHead(title, action = '', closeIcon = 'arrow-left') {
  return `<header class="layer-h">
    <button class="icon-btn" type="button" data-act="close" aria-label="Back">${icon(closeIcon)}</button>
    <h2>${esc(title)}</h2>
    ${action ? `<div class="layer-a">${action}</div>` : ''}
  </header>`;
}

function updatePostUI(id) {
  const p = postById(id);
  if (!p) return;
  const liked = state.liked.includes(id);
  const saved = state.bookmarked.includes(id);
  const likes = p.likes + (liked ? 1 : 0);
  const replies = repliesOf(id).length;

  $$(`[data-post="${id}"]`).forEach((card) => {
    const like = card.querySelector('[data-act="like"]');
    if (like) {
      like.classList.toggle('on', liked);
      like.setAttribute('aria-pressed', String(liked));
      like.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} post, ${plural(likes, 'like')}`);
      like.title = liked ? 'Unlike' : 'Like';
      const count = like.querySelector('[data-count="like"]');
      if (count) count.textContent = likes;
    }
    const mark = card.querySelector('[data-act="bookmark"]');
    if (mark) {
      mark.classList.toggle('on', saved);
      mark.setAttribute('aria-pressed', String(saved));
      mark.setAttribute('aria-label', saved ? 'Remove from saved' : 'Save post');
      mark.title = saved ? 'Remove from saved' : 'Save';
    }
    const rc = card.querySelector('[data-count="replies"]');
    if (rc) {
      rc.textContent = replies || '';
      const reply = card.querySelector('[data-act="open"][aria-label^="Reply"], [data-act="replyfocus"]');
      if (reply) reply.setAttribute('aria-label', replies ? `Reply, ${plural(replies, 'reply')}` : 'Reply');
    }
  });
}

function toggleLike(id, btn, opts = {}) {
  const i = state.liked.indexOf(id);
  const liking = i < 0;
  if (opts.force) {
    if (liking) {
      state.liked.push(id);
      save();
      updatePostUI(id);
      refreshCollectionLayers('liked');
    }
    likeBurst(id, btn, opts.origin);
    return;
  }
  if (i >= 0) state.liked.splice(i, 1);
  else state.liked.push(id);
  save();
  updatePostUI(id);
  if (liking) likeBurst(id, btn, opts.origin);
  else {
    $$(`[data-post="${id}"]`).forEach((card) => {
      card.classList.remove('liked');
      clearTimeout(card.likeTimer);
    });
  }
  refreshCollectionLayers('liked');
}

function findPostEntry(postId) {
  return layers.find((entry) => entry.descriptor && entry.descriptor.type === 'post' && entry.descriptor.id === postId) || null;
}

function activePostEntry(postId) {
  const top = layers[layers.length - 1];
  return top && top.descriptor && top.descriptor.type === 'post' && top.descriptor.id === postId ? top : null;
}

function updateReplyLikes(postId, replyId) {
  const reply = replyById(postId, replyId);
  if (!reply) return;
  const liked = replyLiked(replyId);
  const likes = (reply.likes || 0) + (liked ? 1 : 0);
  $$(`[data-reply="${replyId}"] [data-act="reply-like"]`).forEach((btn) => {
    btn.classList.toggle('on', liked);
    btn.setAttribute('aria-pressed', String(liked));
    btn.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} comment, ${plural(likes, 'like')}`);
    btn.title = liked ? 'Unlike' : 'Like';
    const count = btn.querySelector('[data-count="reply-like"]');
    if (count) count.textContent = likes;
  });
}

function toggleReplyLike(postId, replyId, btn) {
  if (!replyById(postId, replyId)) return;
  const i = state.likedReplies.indexOf(replyId);
  const liking = i < 0;
  if (i >= 0) state.likedReplies.splice(i, 1);
  else state.likedReplies.push(replyId);
  save();
  updateReplyLikes(postId, replyId);
  if (liking) ringBurst(btn);
  refreshCollectionLayers('comments');
}

function deleteReply(postId, replyId) {
  const list = state.replies[postId];
  if (!list) return;
  const reply = list.find((r) => r.id === replyId);
  if (!reply || reply.userId !== 'me') return;
  const parentId = reply.parentId || null;
  for (const r of list) if (r.parentId === replyId) r.parentId = parentId;
  state.replies[postId] = list.filter((r) => r.id !== replyId);
  state.likedReplies = state.likedReplies.filter((rid) => rid !== replyId);
  save();
  updatePostUI(postId);
  const entry = findPostEntry(postId);
  if (entry) {
    if (entry.replyTo && entry.replyTo.id === replyId) entry.clearReplyTo();
    if (entry.refreshReplies) entry.refreshReplies();
  }
  refreshCollectionLayers('comments');
  toast('Comment deleted');
}

function refreshPostThreads(postId) {
  const entry = findPostEntry(postId);
  if (entry && entry.refreshReplies) entry.refreshReplies();
}

function openThread(postId, rootId) {
  threadShown.set(threadKey(postId, rootId), 10);
  refreshPostThreads(postId);
}

function collapseThread(postId, rootId) {
  const key = threadKey(postId, rootId);
  const entry = findPostEntry(postId);
  const branch = entry && entry.el.querySelector(`.reply-thread[data-root="${rootId}"] .thread-branch`);
  if (!branch || branch.classList.contains('closing')) return;
  if (reducedMotion()) {
    threadShown.set(key, 0);
    refreshPostThreads(postId);
    return;
  }
  branch.classList.add('closing');
  setTimeout(() => {
    threadShown.set(key, 0);
    const live = findPostEntry(postId);
    if (live && live.refreshReplies) live.refreshReplies();
  }, 170);
}

function moreThread(postId, rootId) {
  const key = threadKey(postId, rootId);
  threadShown.set(key, (threadShown.get(key) || 10) + 10);
  refreshPostThreads(postId);
}

function openCommentMenu(postId, replyId) {
  const reply = replyById(postId, replyId);
  if (!reply || reply.userId !== 'me') return null;
  const entry = mountLayer(`
    <div class="sheet-backdrop" data-act="close" aria-hidden="true"></div>
    <div class="action-sheet comment-sheet" role="dialog" aria-modal="true" aria-label="Comment options" data-view="actions">
      <div class="sheet-grip" aria-hidden="true"></div>
      <div class="sheet-stage">
        <div class="sheet-view" data-view="actions">
          <button class="sheet-action danger" type="button" data-act="comment-menu-delete">${icon('trash-2')}<span>Delete comment</span></button>
          <button class="sheet-cancel" type="button" data-act="close">Cancel</button>
        </div>
        <div class="sheet-view is-off" data-view="confirm" aria-hidden="true">
          <button class="sheet-delete" type="button" data-act="comment-menu-confirm" data-id="${replyId}" data-post="${postId}">Confirm delete</button>
          <button class="sheet-back" type="button" data-act="comment-menu-back">Cancel</button>
        </div>
      </div>
    </div>
  `, { up: true, cls: 'post-menu-layer comment-menu-layer', descriptor: { type: 'comment-menu', id: replyId } });
  entry.closeMs = VEIL_MS + 20;
  return entry;
}

function showCommentMenuView(sheet, view) {
  if (!sheet) return;
  sheet.dataset.view = view;
  $$('.sheet-view', sheet).forEach((box) => {
    const off = box.dataset.view !== view;
    box.classList.toggle('is-off', off);
    box.setAttribute('aria-hidden', String(off));
  });
  const target = sheet.querySelector(view === 'confirm' ? '[data-act="comment-menu-confirm"]' : '[data-act="comment-menu-delete"]');
  if (target) target.focus({ preventScroll: true });
}

function focusReplyTarget(postId, replyId) {
  if (!postId || !replyById(postId, replyId)) return;
  const existing = activePostEntry(postId);
  const entry = existing || openPost(postId);
  if (!entry || !entry.setReplyTo) return;
  entry.setReplyTo(replyId, !!existing);
  if (!existing && entry.focusReplyInput) {
    setTimeout(() => { if (entry.el.isConnected) entry.focusReplyInput(); }, 320);
  }
}

function mediaInk(card) {
  const imgs = $$('.media img', card);
  if (!imgs.length) return null;
  let img = imgs[0];
  if (imgs.length > 1) {
    const media = card.querySelector('.media');
    if (media) {
      const mr = media.getBoundingClientRect();
      const cx = mr.left + mr.width / 2;
      const cy = mr.top + mr.height / 2;
      let best = Infinity;
      for (const el of imgs) {
        const r = el.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
        if (d < best) { best = d; img = el; }
      }
    }
  }
  if (!img || !img.complete || !img.naturalWidth) return null;
  try {
    const c = document.createElement('canvas');
    c.width = 24;
    c.height = 24;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    const side = Math.min(img.naturalWidth, img.naturalHeight) * .3;
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, 24, 24);
    const data = ctx.getImageData(0, 0, 24, 24).data;
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) {
      sum += .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2];
    }
    return sum / (data.length / 4) / 255 > .6 ? '#111' : '#fff';
  } catch (e) {
    return null;
  }
}

function likeBurst(id, btn, origin) {
  const card = btn ? btn.closest('.post') : document.querySelector(`[data-post="${id}"]`);
  if (!card) return;
  const like = btn || card.querySelector('[data-act="like"]');
  const heart = like && like.querySelector('.i');
  const br = (heart || like || card).getBoundingClientRect();
  const cr = card.getBoundingClientRect();
  const ox = origin && Number.isFinite(origin.x) ? origin.x : br.left + br.width / 2;
  const oy = origin && Number.isFinite(origin.y) ? origin.y : br.top + br.height / 2;
  card.style.setProperty('--lx', Math.round(ox - cr.left) + 'px');
  card.style.setProperty('--ly', Math.round(oy - cr.top) + 'px');

  const mediaHeart = card.querySelector('.media-heart');
  if (mediaHeart) {
    const ink = mediaInk(card);
    if (ink) mediaHeart.style.color = ink;
    else {
      mediaHeart.style.color = '';
      const img = card.querySelector('.media img');
      if (img && !img.complete) {
        img.addEventListener('load', () => {
          const late = mediaInk(card);
          if (late && mediaHeart.isConnected) mediaHeart.style.color = late;
        }, { once: true });
      }
    }
  }

  card.classList.remove('liked');
  void card.offsetWidth;
  card.classList.add('liked');
  clearTimeout(card.likeTimer);
  card.likeTimer = setTimeout(() => card.classList.remove('liked'), 780);

  const ripple = document.createElement('span');
  ripple.className = 'like-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = ox + 'px';
  ripple.style.top = oy + 'px';
  document.body.append(ripple);
  setTimeout(() => ripple.remove(), 800);
}

function ringBurst(el) {
  if (!el) return;
  const icon = el.querySelector('.i') || el;
  const rect = icon.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'like-ripple save-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = (rect.left + rect.width / 2) + 'px';
  ripple.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.append(ripple);
  setTimeout(() => ripple.remove(), 800);
}

function saveBurst(id, btn) {
  const card = btn ? btn.closest('.post') : document.querySelector(`[data-post="${id}"]`);
  if (!card) return;
  ringBurst(btn || card.querySelector('[data-act="bookmark"]'));
}

function toggleBookmark(id, btn) {
  const i = state.bookmarked.indexOf(id);
  const saving = i < 0;
  if (i >= 0) state.bookmarked.splice(i, 1);
  else state.bookmarked.push(id);
  save();
  updatePostUI(id);
  if (saving) saveBurst(id, btn);
  refreshCollectionLayers('saved');
  if (currentTab === 'profile' && profileTab === 'saved') renderProfile();
}

async function sharePost(id) {
  const p = postById(id);
  if (!p) return;
  const text = p.text || 'A photo on Koinara';
  if (navigator.share) {
    try { await navigator.share({ title: 'Koinara', text }); } catch (e) {}
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast('Copied to clipboard');
  } catch (e) {
    toast('Could not copy');
  }
}

function openProfileById(id) {
  if (id === 'me') {
    setTab('profile');
    return;
  }
  openOtherProfile(id);
}

function openOtherProfile(id) {
  const u = user(id);
  const posts = sortedPosts().filter((p) => p.userId === id);
  const friends = followedByFriends(id);
  mountLayer(`
    ${layerHead(u.name)}
    <div class="layer-body">
      ${profileHead(u, posts.length, false)}
      ${friends.length ? `
        <div class="section"><h3 class="section-h">Followed by people you follow</h3></div>
        <div class="mutuals">${friends.map((m) => `<button class="mutual" type="button" data-act="profile" data-id="${m.id}">${av(m, 24)}<span>${esc(m.name)}</span></button>`).join('')}</div>
      ` : ''}
      <div class="section"><h3 class="section-h">Posts</h3></div>
      ${posts.length ? posts.map((p) => postCard(p)).join('') : '<p class="empty">No posts yet.</p>'}
    </div>
  `, { cls: 'profile-layer', descriptor: { type: 'profile', id } });
}

function openPeopleList(id, kind) {
  const u = user(id);
  const followers = kind === 'followers';
  const ids = followers ? followersOf(id) : followingOf(id);
  const note = id === 'me'
    ? (followers ? 'People who follow you.' : 'People you follow.')
    : (followers ? `People who follow ${u.name}.` : `People ${u.name} follows.`);
  const entry = mountLayer(`
    ${layerHead(followers ? 'Followers' : 'Following')}
    <div class="layer-body">
      <p class="people-note">${esc(note)}</p>
      <div class="people-search">
        <span class="search-ic" data-icon="search"></span>
        <input class="field search" name="q" type="search" placeholder="Search people" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-autocomplete="none" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other" aria-label="Search people">
      </div>
      <div class="people-results"></div>
    </div>
  `, { cls: 'people-layer', descriptor: { type: 'people', id, kind: followers ? 'followers' : 'following' } });

  const input = $('.people-search .field', entry.el);
  const results = $('.people-results', entry.el);
  const people = ids.map(user);
  entry.capture = () => input.value.trim() ? { q: input.value.trim() } : {};

  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const found = q
      ? people.filter((p) => `${p.name} ${p.handle} ${p.bio}`.toLowerCase().includes(q))
      : people;
    if (!people.length) {
      results.innerHTML = '<p class="empty">Nobody here yet.</p>';
    } else if (!found.length) {
      results.innerHTML = `<p class="empty">No people found for "${esc(input.value.trim())}".</p>`;
    } else {
      results.innerHTML = found.map(personRow).join('');
    }
    hydrate(results);
    scheduleScrollbar();
  };

  input.addEventListener('input', draw);
  draw();
}

function openSavedPosts() {
  const entry = mountLayer(`
    ${layerHead('Saved posts')}
    <div class="layer-body"></div>
  `, { cls: 'collection-layer', descriptor: { type: 'saved' } });
  const body = $('.layer-body', entry.el);
  const draw = () => {
    const list = sortedPosts().filter((p) => state.bookmarked.includes(p.id));
    const top = body.scrollTop;
    body.innerHTML = list.length ? list.map((p) => postCard(p)).join('') : '<p class="empty">Nothing saved yet. Tap the bookmark on a post to keep it here.</p>';
    body.scrollTop = top;
    hydrate(body);
  };
  entry.refresh = draw;
  draw();
}

function openLikedPosts() {
  const entry = mountLayer(`
    ${layerHead('Liked posts')}
    <div class="layer-body"></div>
  `, { cls: 'collection-layer', descriptor: { type: 'liked' } });
  const body = $('.layer-body', entry.el);
  const draw = () => {
    const list = sortedPosts().filter((p) => state.liked.includes(p.id));
    const top = body.scrollTop;
    body.innerHTML = list.length ? list.map((p) => postCard(p)).join('') : '<p class="empty">No liked posts yet.</p>';
    body.scrollTop = top;
    hydrate(body);
  };
  entry.refresh = draw;
  draw();
}

function openMyComments() {
  const entry = mountLayer(`
    ${layerHead('My comments')}
    <div class="layer-body"></div>
  `, { cls: 'collection-layer', descriptor: { type: 'comments' } });
  const body = $('.layer-body', entry.el);
  const draw = () => {
    const list = myComments();
    const top = body.scrollTop;
    body.innerHTML = list.length ? list.map(commentItem).join('') : '<p class="empty">No comments yet. Replies you write appear here.</p>';
    body.scrollTop = top;
  };
  entry.refresh = draw;
  draw();
}


let activeAvatar = null;
let avatarMorphToken = 0;
let avatarMorphSource = null;

// Matches --t-layer and --t-veil.
const AVATAR_MORPH_CLOSE = 300;
const VEIL_MS = 340;

function hideAvatarSource(el) {
  if (!el) return 0;
  if (avatarMorphSource && avatarMorphSource !== el) {
    avatarMorphSource.style.opacity = '';
    avatarMorphSource.style.pointerEvents = '';
  }
  avatarMorphSource = el;
  el.style.opacity = '0';
  el.style.pointerEvents = 'none';
  return ++avatarMorphToken;
}

function showAvatarSource(token) {
  if (!token || token !== avatarMorphToken) return;
  if (avatarMorphSource) {
    avatarMorphSource.style.opacity = '';
    avatarMorphSource.style.pointerEvents = '';
  }
  avatarMorphSource = null;
}

function placeAvatarFrame(frame, base, target) {
  if (!frame || !base.width || !target.width) return;
  const scale = target.width / base.width;
  const x = target.left + target.width / 2 - (base.left + base.width / 2);
  const y = target.top + target.height / 2 - (base.top + base.height / 2);
  frame.style.setProperty('--fx', `${x}px`);
  frame.style.setProperty('--fy', `${y}px`);
  frame.style.setProperty('--fs', String(scale));
}

function openAvatarView(id, sourceEl = null) {
  if (!knownUser(id)) return null;
  if (activeAvatar && activeAvatar.entry.el.isConnected) return activeAvatar;

  const u = user(id);
  const a = u.avatar || null;
  const src = a && a.d ? a.d : null;
  const media = a && !src && a.m ? a.m : null;
  const seed = a && !src && !media && a.s ? a.s : null;
  const crop = avatarCropCss(a);
  const imgAttrs = crop ? ` class="cropped" style="${crop}"` : '';
  let entry = null;
  let gesture = null;
  let frame = null;
  let frameRect = null;
  let sourceRect = null;
  let morphToken = 0;

  if (sourceEl && sourceEl.isConnected) {
    const r = sourceEl.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) {
      sourceRect = { left: r.left, top: r.top, width: r.width, height: r.height };
    }
  }

  const onResize = () => {
    if (!frame || !frameRect || !entry.el.classList.contains('open')) return;
    const r = frame.getBoundingClientRect();
    if (r.width > 0) frameRect = { left: r.left, top: r.top, width: r.width, height: r.height };
  };

  entry = mountLayer(`
    <div class="avatar-view-veil" data-act="close" aria-hidden="true"></div>
    <div class="avatar-view-center">
      <div class="avatar-view-frame">
        <div class="avatar-view-stage" id="avatar-view-stage">
          ${src ? `<img src="${esc(src)}" alt="${esc(u.name)}" draggable="false"${imgAttrs}>`
            : media ? `<img data-media="${media}" alt="${esc(u.name)}" draggable="false"${imgAttrs}>`
            : seed ? `<img src="assets/img/${esc(seed)}.avif" alt="${esc(u.name)}" draggable="false"${imgAttrs}>`
            : `<span class="avatar-view-fallback">${initials(u.name)}</span>`}
        </div>
      </div>
    </div>
  `, {
    cls: 'avatar-view-layer',
    descriptor: { type: 'avatar', id },
    onClose() {
      if (gesture) {
        gesture.destroy();
        gesture = null;
      }
      removeEventListener('resize', onResize);
      if (frameRect && sourceEl && sourceEl.isConnected) {
        const r = sourceEl.getBoundingClientRect();
        if (r.width > 0) placeAvatarFrame(frame, frameRect, r);
      }
      if (activeAvatar && activeAvatar.entry.el === entry.el) activeAvatar = null;
    }
  });

  entry.el.setAttribute('role', 'dialog');
  entry.el.setAttribute('aria-modal', 'true');
  entry.el.setAttribute('aria-label', `Profile photo of ${u.name}`);

  const stage = $('#avatar-view-stage', entry.el);
  frame = $('.avatar-view-frame', entry.el);
  if (!stage || !frame) return entry;

  if (sourceRect && !entry.el.classList.contains('open')) {
    // Start the photo exactly over the tapped avatar, then let the open
    // class carry it to the centred stage. Transform only, no layout.
    frame.style.transition = 'none';
    frame.style.setProperty('--fx', '0px');
    frame.style.setProperty('--fy', '0px');
    frame.style.setProperty('--fs', '1');
    const r = frame.getBoundingClientRect();
    if (r.width > 0) {
      frameRect = { left: r.left, top: r.top, width: r.width, height: r.height };
      placeAvatarFrame(frame, frameRect, sourceRect);
      frame.style.setProperty('--fo', '1');
      morphToken = hideAvatarSource(sourceEl);
      void frame.offsetWidth;
    }
    frame.style.transition = '';
    addEventListener('resize', onResize);
  }

  if (morphToken) entry.afterClose = () => showAvatarSource(morphToken);
  entry.closeMs = Math.max(AVATAR_MORPH_CLOSE + 40, VEIL_MS + 20);

  gesture = pinchZoom(stage, {
    mouse: true,
    rect: () => frameRect || frame.getBoundingClientRect(),
    end(rest, moved) {
      if (rest && !moved) history.back();
    }
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 320 : e.deltaY;
    gesture.zoomBy(clamp(Math.exp(-delta * .0016), .85, 1.2), e.clientX, e.clientY);
  }, { passive: false });

  activeAvatar = { entry };
  return activeAvatar;
}

function openPost(id) {
  const p = postById(id);
  if (!p) return;

  const entry = mountLayer(`
    ${layerHead('Post')}
    <div class="layer-body" id="detail-body">
      <div class="detail-track" id="detail-track">
        ${postCard(p, { detail: true })}
        <div class="replies" id="detail-replies" data-post="${id}">${repliesHtml(id)}</div>
      </div>
    </div>
    <form class="replybar" id="reply-form">
      <div class="reply-target-wrap" id="reply-target-wrap" inert aria-hidden="true">
        <div class="reply-target" id="reply-target"></div>
      </div>
      <input class="field" name="reply" type="text" maxlength="300" placeholder="Write a reply" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="send" aria-autocomplete="none" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other" aria-label="Write a reply">
      <button class="send" type="submit" aria-label="Send reply">${icon('arrow-up')}</button>
    </form>
  `, {
    cls: 'detail-layer',
    descriptor: { type: 'post', id },
    onClose() {
      for (const key of threadShown.keys()) if (key.startsWith(id + ':')) threadShown.delete(key);
      clearTimeout(entry.postSubmitTimer);
      entry.postSubmit = null;
      keyboardPaddingHold = false;
      if (!currentKeyboardHeight) {
        keyboardPadding = 0;
        document.documentElement.style.setProperty('--keyboard-px', '0px');
      }
    }
  });

  const form = $('#reply-form', entry.el);
  const input = form.querySelector('input');
  const target = $('#reply-target', entry.el);
  const targetWrap = $('#reply-target-wrap', entry.el);
  const repliesEl = $('#detail-replies', entry.el);
  const REPLY_ROW = 48; // chip row height plus its 8px gap

  entry.capture = () => {
    const value = input.value;
    return value.trim() ? { draft: value.slice(0, 300) } : {};
  };

  entry.replyTo = null;

  entry.clearReplyTo = (restore = false) => {
    const scroller = entry.el.querySelector('.layer-body');
    const session = entry.replyScrollSession;
    const base = entry.replyScrollBase;
    const hadChip = form.classList.contains('has-target');
    entry.replyTo = null;
    entry.replyScrollBase = null;
    entry.replyScrollSession = false;
    entry.replyScrollUser = false;
    if (scroller && entry.replyScrollWatch) {
      scroller.removeEventListener('wheel', entry.replyScrollMark);
      scroller.removeEventListener('touchmove', entry.replyScrollMark);
      entry.replyScrollWatch = false;
      entry.replyScrollMark = null;
    }
    form.classList.remove('has-target');
    if (targetWrap) {
      targetWrap.inert = true;
      targetWrap.setAttribute('aria-hidden', 'true');
    }
    if (restore && scroller && session && base != null) {
      const max = scroller.scrollHeight - scroller.clientHeight;
      scrollReplyTo(scroller, Math.max(0, Math.min(max, base)), 'close');
    } else if (restore && hadChip && scroller && currentKeyboardHeight === 0) {
      // With the keyboard closed, collapsing the banner removes 48px of
      // scroll room. Animate the clamp instead of letting it snap.
      keyboardPaddingHold = true;
      const openMax = scroller.scrollHeight - scroller.clientHeight;
      const closedMax = Math.max(0, openMax - REPLY_ROW);
      const from = scroller.scrollTop;
      const to = Math.min(from, closedMax);
      if (to < from) {
        scrollReplyTo(scroller, to, 'banner');
        setTimeout(() => {
          keyboardPaddingHold = false;
          if (!entry.el.isConnected || form.classList.contains('has-target')) return;
          const closedH = entry.replyBarFinal ? entry.replyBarFinal - REPLY_ROW : Math.round(form.getBoundingClientRect().height);
          document.documentElement.style.setProperty('--composer-height', closedH + 'px');
        }, 220);
      } else {
        keyboardPaddingHold = false;
      }
    }
    input.placeholder = 'Write a reply';
    setTimeout(() => {
      if (!entry.replyTo) target.innerHTML = '';
    }, 220);
  };

  entry.setReplyTo = (replyId, focus = true) => {
    const reply = replyById(id, replyId);
    if (!reply) return;
    const barNow = Math.round(form.getBoundingClientRect().height);
    entry.replyBarFinal = barNow - (form.classList.contains('has-target') ? REPLY_ROW : 0) + REPLY_ROW;
    entry.replyTo = reply;
    const u = user(reply.userId);
    target.innerHTML = `<span class="reply-chip">${av(u, 22)}<span class="reply-chip-text">Replying to <b>@${esc(u.handle)}</b></span><button class="reply-cancel" type="button" data-act="reply-cancel" aria-label="Cancel reply">${icon('x')}</button></span>`;
    hydrate(target);
    if (targetWrap) {
      targetWrap.inert = false;
      targetWrap.setAttribute('aria-hidden', 'false');
    }
    form.classList.add('has-target');
    document.documentElement.style.setProperty('--composer-height', entry.replyBarFinal + 'px');
    input.placeholder = `Reply to @${u.handle}`;
    if (focus) input.focus({ preventScroll: true });
    clearTimeout(replyRevealTimer);
    replyRevealTimer = setTimeout(() => {
      if (!keyboardTargetLift) followReplyTarget(0);
    }, 320);
    if (currentKeyboardHeight > 0) {
      requestAnimationFrame(() => {
        if (entry.replyTo) followReplyTarget(keyboardTargetLift);
      });
    }
  };

  entry.focusReplyInput = () => input.focus({ preventScroll: true });

  const releasePostSubmit = (barH) => {
    keyboardPaddingHold = false;
    keyboardPadding = 0;
    document.documentElement.style.setProperty('--keyboard-px', '0px');
    if (barH) document.documentElement.style.setProperty('--composer-height', barH + 'px');
  };

  const revealPostReply = () => {
    entry.postSubmitTimer = 0;
    const pending = entry.postSubmit;
    entry.postSubmit = null;
    if (!pending || !entry.el.isConnected) {
      keyboardPaddingHold = false;
      return;
    }
    const scroller = entry.el.querySelector('.layer-body');
    const node = repliesEl.querySelector(`.reply[data-reply="${pending.id}"]`);
    if (!scroller || !node) {
      keyboardPaddingHold = false;
      return;
    }
    const open = currentKeyboardHeight > 0;
    const barH = open
      ? (entry.replyTo ? entry.replyBarFinal : Math.round(form.getBoundingClientRect().height))
      : pending.closedBarH;
    const barTop = open ? window.innerHeight - keyboardTargetLift - barH : window.innerHeight - barH;
    const topEdge = scroller.getBoundingClientRect().top + 8;
    const bottomEdge = barTop - 12;
    const nr = node.getBoundingClientRect();
    const delta = nr.bottom > bottomEdge ? nr.bottom - bottomEdge : (nr.top < topEdge ? nr.top - topEdge : 0);
    let max = scroller.scrollHeight - scroller.clientHeight;
    if (!open) max = Math.max(0, max - Math.max(0, keyboardPadding) - (pending.hadChip ? REPLY_ROW : 0));
    const to = Math.max(0, Math.min(max, scroller.scrollTop + delta));
    if (open) {
      scrollReplyTo(scroller, to, 'open');
      keyboardPaddingHold = false;
    } else {
      scrollReplyTo(scroller, to, 'close');
      setTimeout(() => releasePostSubmit(pending.closedBarH), 300);
    }
  };

  const drawReplies = () => {
    repliesEl.innerHTML = repliesHtml(id);
    hydrate(repliesEl);
    scheduleScrollbar();
  };
  entry.refreshReplies = drawReplies;

  repliesEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const body = e.target.closest('.reply-body');
    if (!body || !repliesEl.contains(body)) return;
    e.preventDefault();
    focusReplyTarget(id, body.dataset.id);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const reply = { id: uid('r'), userId: 'me', ts: Date.now(), text, likes: 0, parentId: entry.replyTo ? entry.replyTo.id : null };
    if (!state.replies[id]) state.replies[id] = [];
    state.replies[id].push(reply);
    if (reply.parentId) {
      const rootId = replyRootId(id, reply.id);
      if (rootId) threadShown.set(threadKey(id, rootId), 9999);
    }
    const hadChip = !!entry.replyTo;
    const barNow = Math.round(form.getBoundingClientRect().height);
    const closedBarH = (entry.replyBarFinal || barNow) - (hadChip ? REPLY_ROW : 0);
    entry.clearReplyTo();
    input.value = '';
    save();
    drawReplies();
    updatePostUI(id);
    refreshCollectionLayers('comments');
    entry.postSubmit = { id: reply.id, hadChip, closedBarH };
    keyboardPaddingHold = true;
    clearTimeout(entry.postSubmitTimer);
    entry.postSubmitTimer = setTimeout(revealPostReply, 320);
  });

  return entry;
}

/* ------------------------------------------------------------------ chat thread */

function msgHtml(m) {
  const mine = m.from === 'me';
  return `<div class="msg-wrap${mine ? ' me' : ''}">
    <div class="msg${mine ? ' me' : ''}">${esc(m.text)}</div>
    <time datetime="${new Date(m.ts).toISOString()}" data-ts="${m.ts}">${rel(m.ts)}</time>
  </div>`;
}

function scrollBottom(el) {
  el.scrollTop = el.scrollHeight;
}

function attachMsg(container, msg) {
  const tmp = document.createElement('div');
  tmp.innerHTML = msgHtml(msg);
  const node = tmp.firstElementChild;
  const typing = container.querySelector('.typing');
  container.insertBefore(node, typing || null);
  return node;
}

function openChat(chatId) {
  const chat = state.chats.find((c) => c.id === chatId);
  if (!chat) return;
  const u = user(chat.userId);
  const msgs = messagesOf(chat.id);

  chat.lastRead = Date.now();
  save();
  renderChats();

  let entry;
  entry = mountLayer(`
    <header class="layer-h">
      <button class="icon-btn" type="button" data-act="close" aria-label="Back">${icon('arrow-left')}</button>
      <div class="layer-threadname">${av(u, 28)}<span class="name">${esc(u.name)}</span></div>
    </header>
    <div class="msgs" id="thread-msgs">${msgs.map(msgHtml).join('')}</div>
    <form class="composer" id="thread-form">
      <input class="field" name="message" type="text" maxlength="500" placeholder="Message" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true" enterkeyhint="send" aria-autocomplete="none" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other" aria-label="Message ${esc(u.name)}">
      <button class="send" type="submit" aria-label="Send">${icon('arrow-up')}</button>
    </form>
  `, {
    cls: 'thread',
    descriptor: { type: 'chat', id: chat.id },
    onClose() {
      if (activeThread && activeThread.el === entry.el) activeThread = null;
    }
  });

  const form = $('#thread-form', entry.el);
  const input = form.querySelector('input');
  entry.capture = () => input.value.trim() ? { draft: input.value.slice(0, 500) } : {};
  const msgsEl = $('#thread-msgs', entry.el);
  activeThread = { chatId: chat.id, el: entry.el, msgs: msgsEl };

  requestAnimationFrame(() => scrollBottom(msgsEl));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    const msg = { id: uid('m'), from: 'me', ts: Date.now(), text };
    if (!state.messages[chat.id]) state.messages[chat.id] = [];
    state.messages[chat.id].push(msg);
    chat.lastRead = Date.now();
    save();
    attachMsg(msgsEl, msg);
    requestAnimationFrame(() => scrollBottom(msgsEl));
    renderChats();
    scheduleReply(chat);
  });

  updateTabUnread();
}

function scheduleReply(chat) {
  const msgsEl = activeThread && activeThread.chatId === chat.id ? activeThread.msgs : null;
  let typing = null;
  if (msgsEl) {
    typing = document.createElement('div');
    typing.className = 'typing';
    typing.setAttribute('role', 'status');
    typing.setAttribute('aria-label', 'Typing');
    typing.innerHTML = '<i></i><i></i><i></i>';
    msgsEl.append(typing);
    scrollBottom(msgsEl);
  }

  setTimeout(() => {
    if (typing) typing.remove();
    const replies = chat.replies && chat.replies.length ? chat.replies : ['Got it.'];
    const text = replies[chat.r % replies.length];
    chat.r = (chat.r + 1) % replies.length;
    const reply = { id: uid('m'), from: 'them', ts: Date.now(), text };
    if (!state.messages[chat.id]) state.messages[chat.id] = [];
    state.messages[chat.id].push(reply);

    if (activeThread && activeThread.chatId === chat.id) {
      chat.lastRead = Date.now();
      if (activeThread.msgs.isConnected) attachMsg(activeThread.msgs, reply);
      scrollBottom(activeThread.msgs);
    }
    save();
    renderChats();
    updateTabUnread();
  }, 900 + Math.random() * 500);
}

/* ------------------------------------------------------------------ media ingest */


/* ------------------------------------------------------------------ avif */

const scriptLoads = new Map();

function loadScript(src) {
  if (scriptLoads.has(src)) return scriptLoads.get(src);
  const pending = new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.onload = resolve;
    el.onerror = () => reject(new Error('Could not load ' + src));
    document.head.append(el);
  });
  scriptLoads.set(src, pending);
  return pending;
}

let avifWasm = null;

function avifWasmBinary() {
  if (avifWasm) return avifWasm;
  avifWasm = (async () => {
    if (!('DecompressionStream' in window)) return null;
    await loadScript('assets/avif/wasm_avif_b64.js');
    const b64 = window.AVIF_WASM_GZ;
    if (!b64) return null;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  })().catch(() => null);
  return avifWasm;
}

async function encodeAvif(canvas) {
  try {
    const wasmBinary = await avifWasmBinary();
    if (!wasmBinary) return null;
    await loadScript('assets/avif/wasm_avif.js');
    if (typeof window.wasm_avif !== 'function') return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const mod = await window.wasm_avif({ wasmBinary: wasmBinary.slice(0) });
    const out = mod.encode(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      canvas.width,
      canvas.height,
      4,
      {
        minQuantizer: 20,
        maxQuantizer: 26,
        minQuantizerAlpha: 24,
        maxQuantizerAlpha: 30,
        tileRowsLog2: 0,
        tileColsLog2: 0,
        speed: 8
      },
      3
    );
    mod.free();
    if (!out || out.error || !out.length) return null;
    return new Blob([out], { type: 'image/avif' });
  } catch (e) {
    return null;
  }
}

async function compressImage(file, max = 1600, quality = .82) {
  let src, w, h, cleanup = () => {};
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    src = bmp; w = bmp.width; h = bmp.height;
    cleanup = () => { if (bmp.close) bmp.close(); };
  } catch (e) {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = url;
    });
    if (!img) { URL.revokeObjectURL(url); return null; }
    src = img; w = img.naturalWidth; h = img.naturalHeight;
    cleanup = () => URL.revokeObjectURL(url);
  }

  const scale = Math.min(1, max / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, cw, ch);
  cleanup();

  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  let blob = await encodeAvif(canvas);
  let type = 'image/avif';
  if (!blob) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    type = 'image/webp';
  }
  if (!blob) return null;
  const id = uid('m');
  try { await idbPut(id, blob); } catch (e) { return null; }
  state.uploaded[id] = { w: cw, h: ch, type };
  save();
  return { m: id, w: cw, h: ch, type };
}


async function loadBakeSource(a) {
  let url = null;
  let revoke = false;
  if (a.m) {
    const blob = await idbGet(a.m);
    if (!blob) return null;
    url = URL.createObjectURL(blob);
    revoke = true;
  } else if (a.s) {
    url = `assets/img/${a.s}-800.avif`;
  }
  if (!url) return null;
  const img = new Image();
  img.decoding = 'async';
  const loaded = new Promise((resolve) => {
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
  });
  img.src = url;
  if (!(await loaded)) {
    if (revoke) URL.revokeObjectURL(url);
    return null;
  }
  return { img, cleanup: () => { if (revoke) URL.revokeObjectURL(url); } };
}

async function bakeCrop(a, ratioCss, maxEdge) {
  const src = await loadBakeSource(a);
  if (!src) return null;
  try {
    const F = ratioValue(ratioCss);
    const w = Math.max(1, a.w || src.img.naturalWidth);
    const h = Math.max(1, a.h || src.img.naturalHeight);
    const A = w / h;
    const sw0 = Math.min(w, h * F);
    const sh0 = sw0 / F;
    const c = normalizeCrop(a.crop);
    const sw = sw0 / c.z;
    const sh = sh0 / c.z;
    const left = (w - sw0) / 2 + (sw0 - sw) / 2 * (1 - c.x);
    const top = (h - sh0) / 2 + (sh0 - sh) / 2 * (1 - c.y);
    const outW = F >= 1 ? maxEdge : Math.max(1, Math.round(maxEdge * F));
    const outH = F >= 1 ? Math.max(1, Math.round(maxEdge / F)) : maxEdge;
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src.img, left, top, sw, sh, 0, 0, outW, outH);
    await new Promise((resolve) => requestAnimationFrame(() => resolve()));
    let blob = await encodeAvif(canvas);
    let type = 'image/avif';
    if (!blob) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', .82));
      type = 'image/webp';
    }
    if (!blob) return null;
    const id = uid('m');
    try { await idbPut(id, blob); } catch (e) { return null; }
    state.uploaded[id] = { w: outW, h: outH, type };
    save();
    return { m: id, w: outW, h: outH, type };
  } finally {
    src.cleanup();
  }
}

function discardMedia(id) {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  idbDelete(id).catch(() => {});
  delete state.uploaded[id];
  save();
}


/* ------------------------------------------------------------------ post options */

function refreshPostLayers(id) {
  const p = postById(id);
  if (!p) return;
  for (const entry of layers) {
    if (!entry.descriptor || entry.descriptor.type !== 'post' || entry.descriptor.id !== id) continue;
    const card = $(`.post[data-post="${id}"]`, entry.el);
    if (!card) continue;
    card.outerHTML = postCard(p, { detail: true });
    hydrate(entry.el);
  }
  scheduleScrollbar();
}

function deletePost(id) {
  const p = postById(id);
  if (!p || p.userId !== 'me') return;
  const media = (p.images || []).map((im) => im.m).filter(Boolean);
  state.posts = state.posts.filter((post) => post.id !== id);
  delete state.replies[id];
  state.liked = state.liked.filter((postId) => postId !== id);
  state.bookmarked = state.bookmarked.filter((postId) => postId !== id);
  for (const m of media) {
    if (!state.posts.some((post) => (post.images || []).some((im) => im.m === m))) discardMedia(m);
  }
  save();
  renderFeed();
  renderProfile();
  renderExplore();
  refreshCollectionLayers('saved');
  refreshCollectionLayers('liked');
  refreshCollectionLayers('comments');
}

function closeSheetThen(fn) {
  if (!layers.length) { fn(); return; }
  history.back();
  setTimeout(fn, 340);
}

function openPostMenu(id) {
  const p = postById(id);
  if (!p || p.userId !== 'me') return;

  let drag = null;
  let dragFrame = 0;
  let deleted = false;
  let deleting = false;
  let deleteTimer = 0;

  const entry = mountLayer(`
    <div class="sheet-backdrop" data-act="close" aria-hidden="true"></div>
    <div class="action-sheet" role="dialog" aria-modal="true" aria-label="Post options" data-view="actions">
      <div class="sheet-grip" aria-hidden="true"></div>
      <div class="sheet-stage">
        <div class="sheet-view" data-view="actions">
          <button class="sheet-action" type="button" data-act="edit-post" data-id="${p.id}">${icon('pen')}<span>Edit post</span></button>
          <button class="sheet-action danger" type="button" data-act="menu-delete" data-id="${p.id}">${icon('trash-2')}<span>Delete post</span></button>
          <button class="sheet-cancel" type="button" data-act="close">Cancel</button>
        </div>
        <div class="sheet-view sheet-confirm is-off" data-view="confirm" aria-hidden="true">
          <h3>Delete post?</h3>
          <p>This cannot be undone.</p>
          <button class="sheet-delete" type="button" data-act="menu-confirm" data-id="${p.id}">Delete post</button>
          <button class="sheet-back" type="button" data-act="menu-back">Cancel</button>
        </div>
      </div>
    </div>
  `, {
    up: true,
    cls: 'post-menu-layer',
    descriptor: { type: 'post-menu', id },
    onClose() {
      removeEventListener('pointermove', onDragMove);
      removeEventListener('pointerup', onDragEnd);
      removeEventListener('pointercancel', onDragEnd);
      if (dragFrame) cancelAnimationFrame(dragFrame);
      if (deleteTimer) clearTimeout(deleteTimer);
      dragFrame = 0;
      deleteTimer = 0;
      drag = null;
      if (deleted) {
        setTimeout(() => toast('Post deleted'), 320);
        if (layers.some((e) => e.descriptor && e.descriptor.type === 'post' && e.descriptor.id === id)) {
          setTimeout(() => history.back(), 0);
        }
      }
    }
  });
  entry.closeMs = VEIL_MS + 20;

  const el = entry.el;
  const sheet = $('.action-sheet', el);

  function showView(view) {
    sheet.dataset.view = view;
    $$('.sheet-view', el).forEach((box) => {
      const off = box.dataset.view !== view;
      box.classList.toggle('is-off', off);
      box.setAttribute('aria-hidden', String(off));
    });
    const target = view === 'confirm' ? $('[data-act="menu-back"]', el) : $('[data-act="menu-delete"]', el);
    if (target) target.focus({ preventScroll: true });
  }

  function onDragMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const dy = Math.max(0, e.clientY - drag.y);
    if (!drag.active && dy < 6) return;
    if (!drag.active) {
      drag.active = true;
      sheet.classList.add('dragging');
    }
    drag.dy = dy;
    if (dragFrame) return;
    dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      if (!drag) return;
      sheet.style.transform = `translate3d(0, ${drag.dy}px, 0)`;
    });
  }

  function onDragEnd(e) {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (dragFrame) { cancelAnimationFrame(dragFrame); dragFrame = 0; }
    if (!d.active) return;
    suppressClickUntil = performance.now() + 120;
    const quick = d.dy / Math.max(1, performance.now() - d.t) > .55;
    if (d.dy > 90 || quick) {
      sheet.classList.remove('dragging');
      sheet.style.transform = 'translate3d(0, 100%, 0)';
      history.back();
    } else {
      sheet.classList.remove('dragging');
      sheet.style.transform = '';
    }
  }

  sheet.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, y: e.clientY, dy: 0, t: performance.now(), active: false };
    addEventListener('pointermove', onDragMove);
    addEventListener('pointerup', onDragEnd);
    addEventListener('pointercancel', onDragEnd);
  });

  el.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'menu-delete') {
      e.preventDefault();
      e.stopPropagation();
      showView('confirm');
    } else if (act.dataset.act === 'menu-back') {
      e.preventDefault();
      e.stopPropagation();
      showView('actions');
    } else if (act.dataset.act === 'menu-confirm') {
      e.preventDefault();
      e.stopPropagation();
      if (deleting) return;
      deleting = true;
      deleted = true;
      sheet.classList.add('is-deleting');
      deletePost(p.id);
      deleteTimer = setTimeout(() => {
        deleteTimer = 0;
        if (layers.includes(entry)) history.back();
      }, 160);
    }
  });
}

/* ------------------------------------------------------------------ compose */

let activeCompose = null;
let activeCrop = null;

function openCompose(restore) {
  if (activeCompose && activeCompose.entry.el.isConnected) return activeCompose;

  const editing = restore && restore.postId ? postById(restore.postId) : null;
  if (restore && restore.postId && (!editing || editing.userId !== 'me')) return null;

  const source = editing ? null : (restore && restore.draft ? restore.draft : (ui.composeDraft || null));
  const draft = editing ? null : (sanitizeDraft(source) || { text: '', tags: [], ratio: 'auto', attachments: [] });
  const attachments = editing
    ? (editing.images || [])
      .filter((a) => a && (a.s || (a.m && state.uploaded[a.m])))
      .map((a) => ({ ...a, crop: normalizeCrop(a.crop) }))
    : draft.attachments
      .filter((a) => a && state.uploaded[a.m])
      .map((a) => ({ ...a, crop: normalizeCrop(a.crop) }));
  let tags = (editing ? editing.tags || [] : draft.tags).slice(0, 3);
  let ratio = editing ? (editing.ratio || 'auto') : draft.ratio;
  const originalMedia = new Set((editing ? editing.images || [] : []).map((a) => a.m).filter(Boolean));
  const title = editing ? 'Edit post' : 'New post';
  let busy = 0;
  let publishing = false;
  let closed = false;
  let published = false;
  let discarded = false;
  let draftTimer = 0;

  const entry = mountLayer(`
    <header class="layer-h">
      <button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon('x')}</button>
      <h2>${title}</h2>
    </header>
    <div class="layer-body compose-body">
      <div class="compose-edit">
        <section class="compose-section">
          <textarea class="compose-area" id="compose-text" maxlength="500" placeholder="What's on your mind?" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other" aria-label="Post text"></textarea>
        </section>

        <section class="compose-section">
          <div class="compose-tools">
            <button class="ratio-chip" id="compose-ratio-btn" type="button" title="Change aspect ratio">Auto</button>
            <span class="compose-note" id="photo-count">0/5</span>
          </div>
          <div class="photo-grid" id="compose-photos"></div>
          <input id="compose-file" type="file" accept="image/*" multiple hidden>
        </section>

        <section class="compose-section">
          <div class="tagedit">
            <div class="tagchips" id="compose-tags"></div>
            <input class="taginput" id="compose-tag" name="tag" type="text" maxlength="24" placeholder="Add up to 3 tags" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-autocomplete="none" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other" aria-label="Add a tag">
          </div>
        </section>
      </div>

      <aside class="compose-side">
        <section class="compose-section preview-section">
          <div class="post-preview" id="compose-preview" aria-label="Post preview"></div>
        </section>
      </aside>
    </div>
    <footer class="compose-foot">
      <button class="btn ghost compose-discard" id="compose-discard" type="button">${editing ? 'Cancel' : 'Discard'}</button>
      <span class="spacer"></span>
      <span class="count" id="compose-count">0/500</span>
      <button class="btn compose-submit" id="publish" type="button" disabled>${editing ? 'Save' : 'Post'}</button>
    </footer>
  `, {
    cls: 'compose-layer',
    descriptor: editing ? { type: 'compose', postId: editing.id } : { type: 'compose' },
    capture() {
      return editing ? { postId: editing.id } : { draft: buildDraft() };
    },
    onClose() {
      closed = true;
      clearTimeout(draftTimer);
      draftTimer = 0;
      if (editing) {
        if (!published) {
          for (const a of attachments) if (a.m && !originalMedia.has(a.m)) discardMedia(a.m);
        }
      } else if (published || discarded) {
        ui.composeDraft = null;
        saveUI();
      } else {
        saveDraftNow();
      }
      if (activeCompose && activeCompose.entry.el === entry.el) activeCompose = null;
    }
  });

  const el = entry.el;
  const area = $('#compose-text', el);
  const publish = $('#publish', el);
  const count = $('#compose-count', el);
  const photosEl = $('#compose-photos', el);
  const photoCount = $('#photo-count', el);
  const ratioBtn = $('#compose-ratio-btn', el);
  const file = $('#compose-file', el);
  const tagBox = $('#compose-tags', el);
  const tagInput = $('#compose-tag', el);
  const preview = $('#compose-preview', el);
  const discard = $('#compose-discard', el);

  const cleanTag = (raw) => String(raw || '').trim().replace(/^#+/, '').toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '').slice(0, 24);

  function imageRows() {
    return attachments.map((a) => {
      const im = { w: a.w, h: a.h, crop: { ...a.crop } };
      if (a.m) im.m = a.m;
      if (a.s) im.s = a.s;
      if (a.a) im.a = a.a;
      return im;
    });
  }

  function buildDraft() {
    if (editing) return null;
    const text = area ? area.value.slice(0, 500) : '';
    if (!text.trim() && !tags.length && !attachments.length) return null;
    return { text, tags: tags.slice(), ratio, attachments: imageRows() };
  }

  function saveDraftNow() {
    if (editing) return;
    clearTimeout(draftTimer);
    draftTimer = 0;
    ui.composeDraft = buildDraft();
    saveUI();
  }

  function saveDraft() {
    if (editing) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 180);
  }

  function previewPost() {
    return {
      id: editing ? editing.id : 'preview',
      userId: 'me',
      ts: editing ? editing.ts : Date.now(),
      likes: editing ? editing.likes : 0,
      text: area.value.trim(),
      tags: tags.slice(),
      images: imageRows(),
      ratio
    };
  }

  function syncPreview() {
    const p = previewPost();
    const has = p.text || p.images.length || p.tags.length;
    if (!has) {
      preview.innerHTML = '<p class="preview-empty">Your post will appear here.</p>';
      return;
    }
    preview.innerHTML = postCard(p);
    const card = preview.querySelector('.post');
    if (card) card.tabIndex = -1;
    hydrate(preview);
  }

  function sync() {
    photoCount.textContent = attachments.length + '/5';
    ratioBtn.textContent = ratioLabel(ratio);
    ratioBtn.disabled = !attachments.length;
    count.textContent = busy ? 'Compressing...' : area.value.length + '/500';
    publish.disabled = busy > 0 || (!area.value.trim() && attachments.length === 0);
    discard.disabled = editing ? false : (!area.value.trim() && !attachments.length && !tags.length);
    syncPreview();
    scheduleScrollbar();
    saveDraft();
  }

  function grow() {
    area.style.height = 'auto';
    area.style.height = Math.max(120, area.scrollHeight) + 'px';
  }

  function thumbHtml(a, i) {
    return `<div class="photo-tile" data-tile="${i}">
      <button class="photo-thumb" type="button" data-edit="${i}" aria-label="Edit photo ${i + 1}">
        ${editorImg(a, '1 / 1')}
      </button>
      <span class="photo-index">${i + 1}</span>
      <button class="photo-remove" type="button" data-rm="${i}" aria-label="Remove photo ${i + 1}">${icon('x')}</button>
    </div>`;
  }

  function renderPhotos() {
    const add = attachments.length < 5
      ? `<button class="photo-tile photo-add-tile" id="photo-add" type="button" aria-label="Add photos">${icon('plus')}<span>Add</span></button>`
      : '';
    photosEl.innerHTML = attachments.map(thumbHtml).join('') + add;
    hydrate(photosEl);
    sync();
  }

  function renderTags() {
    tagBox.innerHTML = tags.map((t) => `<span class="tagchip">#${esc(t)}<button type="button" data-rm-tag="${esc(t)}" aria-label="Remove #${esc(t)}">${icon('x')}</button></span>`).join('');
    tagInput.hidden = tags.length >= 3;
    tagInput.placeholder = tags.length ? 'Add another tag' : 'Add up to 3 tags';
    sync();
  }

  function addTag(raw) {
    const tag = cleanTag(raw);
    if (!tag || tags.includes(tag)) return;
    if (tags.length >= 3) { toast('Up to three tags.'); return; }
    tags.push(tag);
    renderTags();
  }

  function openEditor(index = 0) {
    if (!attachments.length) { toast('Add a photo first.'); return; }
    openCropEditor(index);
  }

  function refresh() {
    if (!el.isConnected) return;
    renderPhotos();
    sync();
  }

  function removeAt(index) {
    const a = attachments[index];
    if (!a) return;
    attachments.splice(index, 1);
    if (a.m && !originalMedia.has(a.m)) discardMedia(a.m);
    refresh();
  }

  function discardNow() {
    discarded = true;
    for (const a of attachments) {
      if (a.m && !originalMedia.has(a.m)) discardMedia(a.m);
    }
    attachments.length = 0;
    tags = [];
    if (area) area.value = '';
    ui.composeDraft = null;
    saveUI();
  }

  activeCompose = {
    entry,
    el,
    get attachments() { return attachments; },
    get ratio() { return ratio; },
    set ratio(v) { ratio = PHOTO_RATIO_KEYS.includes(v) ? v : 'auto'; },
    refresh,
    removeAt,
    saveDraft,
    saveDraftNow,
    discardNow,
    openEditor
  };

  area.addEventListener('input', () => { grow(); sync(); });
  area.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      publish.click();
    }
  });

  photosEl.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const i = Number(rm.dataset.rm);
      if (Number.isInteger(i)) removeAt(i);
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) { openEditor(Number(edit.dataset.edit) || 0); return; }
    if (e.target.closest('#photo-add')) {
      file.multiple = 5 - attachments.length > 1;
      file.click();
    }
  });

  tagBox.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-rm-tag]');
    if (!btn) return;
    tags = tags.filter((t) => t !== btn.dataset.rmTag);
    renderTags();
  });

  tagInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput.value);
      tagInput.value = '';
    } else if (e.key === 'Backspace' && !tagInput.value && tags.length) {
      tags.pop();
      renderTags();
    }
  });

  tagInput.addEventListener('input', () => {
    if (!/[,\s]/.test(tagInput.value)) return;
    const parts = tagInput.value.split(/[,\s]+/);
    tagInput.value = parts.pop() || '';
    for (const part of parts) addTag(part);
  });

  tagInput.addEventListener('blur', () => {
    if (!tagInput.value.trim()) return;
    addTag(tagInput.value);
    tagInput.value = '';
  });

  ratioBtn.addEventListener('click', () => openEditor(0));
  discard.addEventListener('click', () => {
    if (discard.disabled) return;
    if (editing) { history.back(); return; }
    openConfirm('discard');
  });

  file.addEventListener('change', async () => {
    const all = Array.from(file.files || []);
    file.value = '';
    const room = 5 - attachments.length;
    const overflow = all.length > room;
    const files = all.slice(0, room);
    if (!files.length) {
      if (overflow) toast('Five photos max.');
      return;
    }
    busy += files.length;
    processShow(files.length);
    sync();
    let done = 0;
    for (const f of files) {
      try {
        const im = await compressImage(f);
        if (im && closed) discardMedia(im.m);
        else if (im && attachments.length < 5) {
          attachments.push({ ...im, crop: { x: 0, y: 0, z: 1 } });
          renderPhotos();
        } else if (!im) {
          toast("That photo didn't load.");
        }
      } catch (e) {
        toast("That photo didn't load.");
      }
      busy -= 1;
      done += 1;
      processStep(done, files.length);
      sync();
    }
    processHide();
    if (overflow) toast('Five photos max. Extra files were skipped.');
  });

  publish.addEventListener('click', async () => {
    if (publish.disabled || publishing) return;
    publishing = true;
    publish.disabled = true;
    const source = imageRows();
    const ratioCss = ratioFor(ratio, source);
    const frame = ratioValue(ratioCss);
    const needs = (im) => {
      const c = normalizeCrop(im.crop);
      return c.x !== 0 || c.y !== 0 || c.z !== 1 || Math.abs((im.w / im.h) - frame) > .01;
    };
    const work = source.filter(needs);
    let images = source;
    const discards = [];
    if (work.length) {
      processShow(work.length);
      const baked = [];
      let done = 0;
      for (const im of source) {
        if (!needs(im)) {
          baked.push(im);
          continue;
        }
        const out = await bakeCrop(im, ratioCss, 1400);
        if (out) {
          baked.push({ m: out.m, w: out.w, h: out.h, a: im.a || '' });
          if (im.m) discards.push(im.m);
        } else {
          baked.push({ ...im, crop: normalizeCrop(im.crop) });
          toast("One photo could not be hard cropped.");
        }
        done += 1;
        processStep(done, work.length);
      }
      processHide();
      images = baked;
    }
    if (closed) {
      for (const im of images) {
        if (im.m && !source.some((row) => row.m === im.m)) discardMedia(im.m);
      }
      publishing = false;
      return;
    }
    if (editing) {
      const kept = new Set(images.map((im) => im.m).filter(Boolean));
      for (const m of originalMedia) if (!kept.has(m)) discardMedia(m);
      editing.text = area.value.trim();
      editing.tags = tags.slice();
      editing.ratio = ratio;
      editing.images = images;
      published = true;
      save();
      renderFeed();
      renderProfile();
      renderExplore();
      refreshPostLayers(editing.id);
      refreshCollectionLayers('saved');
      refreshCollectionLayers('liked');
      refreshCollectionLayers('comments');
      toast('Post updated');
      history.back();
      return;
    }
    const post = {
      id: uid('p'),
      userId: 'me',
      ts: Date.now(),
      likes: 0,
      text: area.value.trim(),
      tags: tags.slice(),
      ratio,
      images
    };
    state.posts.push(post);
    published = true;
    ui.composeDraft = null;
    for (const m of discards) discardMedia(m);
    save();
    saveUI();
    renderFeed(post.id);
    setTab('feed', { top: true });
    renderProfile();
    renderExplore();
    toast('Posted');
  });

  area.value = editing ? editing.text : (draft.text || '');
  renderTags();
  grow();
  renderPhotos();
  if (!restore && matchMedia('(pointer: fine)').matches) {
    requestAnimationFrame(() => {
      if (area.isConnected) area.focus({ preventScroll: true });
    });
  }
  return activeCompose;
}

function openCropEditor(index = 0) {
  const comp = activeCompose;
  if (!comp) return;
  if (activeCrop && activeCrop.entry.el.isConnected) {
    activeCrop.select(index);
    return activeCrop;
  }
  const list = comp.attachments;
  if (!list.length) return;
  let current = clamp(Number(index) || 0, 0, list.length - 1);
  let lastTap = null;
  let cleanupResize = null;
  let stageRect = null;

  const entry = mountLayer(`
    <header class="layer-h">
      <button class="icon-btn" type="button" data-act="close" aria-label="Back">${icon('arrow-left')}</button>
      <h2>Crop</h2>
      <div class="layer-a"><span class="crop-count" id="crop-count"></span></div>
    </header>
    <div class="layer-body crop-body">
      <div class="crop-stage-wrap" id="crop-stage-wrap">
        <div class="crop-stage" id="crop-stage" tabindex="0" role="application" aria-label="Crop photo"></div>
      </div>
      <div class="crop-bottom">
        <div class="crop-film" id="crop-film"></div>
        <div class="seg five ratio-seg crop-ratio" id="crop-ratio">
          ${PHOTO_RATIO_KEYS.map((key) => `<button class="${comp.ratio === key ? 'on' : ''}" type="button" data-v="${key}">${ratioLabel(key)}</button>`).join('')}
        </div>
        <input class="crop-zoom" id="crop-zoom" type="range" min="1" max="4" step=".01" value="1" aria-label="Zoom photo">
        <button class="btn block crop-done" id="crop-done" type="button">Done</button>
      </div>
    </div>
  `, {
    up: true,
    cls: 'crop-layer',
    descriptor: { type: 'crop' },
    capture() { return { index: current }; },
    onClose() {
      if (cleanupResize) cleanupResize();
      cancelCropFrames();
      activeCrop = null;
      comp.saveDraftNow();
      // Refresh the composer after the crop layer has finished sliding away.
      setTimeout(() => comp.refresh(), 260);
    }
  });

  const el = entry.el;
  const wrap = $('#crop-stage-wrap', el);
  const stage = $('#crop-stage', el);
  const film = $('#crop-film', el);
  const count = $('#crop-count', el);
  const ratioSeg = $('#crop-ratio', el);
  const zoom = $('#crop-zoom', el);

  const frameRatio = () => ratioFor(comp.ratio, list);
  const photo = () => list[current];
  const stageImg = () => stage.querySelector('img');

  function layout() {
    const a = photo();
    if (!a) return;
    const R = ratioValue(frameRatio());
    const cs = getComputedStyle(wrap);
    const availW = Math.max(80, wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    const availH = Math.max(80, wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    let w = Math.min(availW, availH * R);
    let h = w / R;
    if (h > availH) { h = availH; w = h * R; }
    stage.style.width = Math.round(w) + 'px';
    stage.style.height = Math.round(h) + 'px';
    stage.innerHTML = editorImg(a, frameRatio());
    hydrate(stage);
    stageRect = stage.getBoundingClientRect();
    syncZoom();
  }

  function syncZoom() {
    const a = photo();
    const value = a ? a.crop.z : 1;
    zoom.value = String(value);
    zoom.style.setProperty('--p', ((value - 1) / 3).toFixed(4));
  }

  function updateImage() {
    const a = photo();
    const img = stageImg();
    if (!a || !img) return;
    const m = cropMetrics(a, frameRatio());
    img.style.transform = `translate3d(-50%,-50%,0) translate3d(${m.px}%,${m.py}%,0) scale(${m.z})`;
    syncZoom();
    comp.saveDraft();
  }

  function panBy(dx, dy) {
    const a = photo();
    if (!a) return;
    const rect = stageRect || stage.getBoundingClientRect();
    const m = cropMetrics(a, frameRatio());
    const maxX = (m.w / 100 * rect.width - rect.width) / 2;
    const maxY = (m.h / 100 * rect.height - rect.height) / 2;
    if (maxX > .5) a.crop.x = clamp(a.crop.x + dx / maxX, -1, 1);
    if (maxY > .5) a.crop.y = clamp(a.crop.y + dy / maxY, -1, 1);
    updateImage();
  }

  function zoomTo(z, clientX, clientY) {
    const a = photo();
    if (!a) return;
    const rect = stageRect || stage.getBoundingClientRect();
    const qx = clientX - (rect.left + rect.width / 2);
    const qy = clientY - (rect.top + rect.height / 2);
    const before = cropMetrics(a, frameRatio());
    const sx = before.w / 100 * rect.width;
    const sy = before.h / 100 * rect.height;
    const panX = before.x * (sx - rect.width) / 2;
    const panY = before.y * (sy - rect.height) / 2;
    const ux = sx > 0 ? (qx - panX) / sx : 0;
    const uy = sy > 0 ? (qy - panY) / sy : 0;

    a.crop.z = clamp(z, 1, 4);
    const after = cropMetrics(a, frameRatio());
    const sx2 = after.w / 100 * rect.width;
    const sy2 = after.h / 100 * rect.height;
    const panX2 = qx - ux * sx2;
    const panY2 = qy - uy * sy2;
    const maxX = (sx2 - rect.width) / 2;
    const maxY = (sy2 - rect.height) / 2;
    a.crop.x = maxX > .5 ? clamp(panX2 / maxX, -1, 1) : 0;
    a.crop.y = maxY > .5 ? clamp(panY2 / maxY, -1, 1) : 0;
    updateImage();
  }

  function resetCrop() {
    const a = photo();
    if (!a) return;
    a.crop = { x: 0, y: 0, z: 1 };
    updateImage();
  }

  function select(next) {
    current = clamp(Number(next) || 0, 0, list.length - 1);
    layout();
    renderFilm();
  }

  function renderFilm() {
    film.hidden = list.length < 2;
    film.innerHTML = list.map((a, i) => `<button class="film-thumb${i === current ? ' on' : ''}" type="button" data-film="${i}" aria-label="Photo ${i + 1}">
      ${editorImg(a, '1 / 1')}
    </button>`).join('');
    if (count) count.textContent = list.length > 1 ? `${current + 1} of ${list.length}` : '';
    hydrate(film);
  }

  const pointers = new Map();
  let pan = null;
  let pinch = null;
  let panFrame = 0;
  let panQueue = null;
  let zoomFrame = 0;
  let zoomQueue = null;
  let sliderFrame = 0;
  let wheelFrame = 0;
  let wheelAnim = 0;
  let wheelDelta = 0;
  let wheelCtrl = false;
  let wheelPoint = null;
  let wheelTarget = null;

  function cancelCropFrames() {
    if (panFrame) cancelAnimationFrame(panFrame);
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
    if (sliderFrame) cancelAnimationFrame(sliderFrame);
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    if (wheelAnim) cancelAnimationFrame(wheelAnim);
    panFrame = zoomFrame = sliderFrame = wheelFrame = wheelAnim = 0;
    panQueue = zoomQueue = wheelPoint = wheelTarget = null;
  }

  function cancelWheelGlide() {
    if (wheelAnim) cancelAnimationFrame(wheelAnim);
    wheelAnim = 0;
    wheelTarget = null;
  }

  function stepWheelGlide() {
    wheelAnim = 0;
    const a = photo();
    if (!a || !wheelTarget) return;
    const diff = wheelTarget.z - a.crop.z;
    if (Math.abs(diff) < .002) {
      zoomTo(wheelTarget.z, wheelTarget.x, wheelTarget.y);
      wheelTarget = null;
      return;
    }
    zoomTo(a.crop.z + diff * .3, wheelTarget.x, wheelTarget.y);
    wheelAnim = requestAnimationFrame(stepWheelGlide);
  }

  function queuePan(dx, dy) {
    if (!panQueue) panQueue = { dx: 0, dy: 0 };
    panQueue.dx += dx;
    panQueue.dy += dy;
    if (panFrame) return;
    panFrame = requestAnimationFrame(() => {
      panFrame = 0;
      const q = panQueue;
      panQueue = null;
      if (q) panBy(q.dx, q.dy);
    });
  }

  function flushPan() {
    if (panFrame) { cancelAnimationFrame(panFrame); panFrame = 0; }
    const q = panQueue;
    panQueue = null;
    if (q) panBy(q.dx, q.dy);
  }

  function queueZoom(z, x, y) {
    zoomQueue = { z, x, y };
    if (zoomFrame) return;
    zoomFrame = requestAnimationFrame(() => {
      zoomFrame = 0;
      const q = zoomQueue;
      zoomQueue = null;
      if (q) zoomTo(q.z, q.x, q.y);
    });
  }

  function flushZoom() {
    if (zoomFrame) { cancelAnimationFrame(zoomFrame); zoomFrame = 0; }
    const q = zoomQueue;
    zoomQueue = null;
    if (q) zoomTo(q.z, q.x, q.y);
  }

  function startPinch() {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    pinch = {
      dist: Math.max(1, Math.hypot(dx, dy)),
      mid: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
      z: photo() ? photo().crop.z : 1
    };
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    cancelWheelGlide();
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    stageRect = stage.getBoundingClientRect();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      pan = { x: e.clientX, y: e.clientY };
      pinch = null;
    } else if (pointers.size === 2) {
      pan = null;
      startPinch();
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      queueZoom(pinch.z * dist / pinch.dist, mid.x, mid.y);
    } else if (pan && pointers.size === 1) {
      queuePan(e.clientX - pan.x, e.clientY - pan.y);
      pan = { x: e.clientX, y: e.clientY };
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    flushPan();
    flushZoom();
    if (pointers.size === 1) {
      const only = Array.from(pointers.values())[0];
      pan = { x: only.x, y: only.y };
      pinch = null;
    } else if (!pointers.size) {
      pan = null;
      pinch = null;
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (!photo()) return;
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 320 : e.deltaY;
    wheelDelta += delta;
    wheelCtrl = e.ctrlKey;
    wheelPoint = { x: e.clientX, y: e.clientY };
    if (wheelFrame) return;
    wheelFrame = requestAnimationFrame(() => {
      wheelFrame = 0;
      const a = photo();
      const point = wheelPoint;
      const total = wheelDelta;
      wheelDelta = 0;
      wheelPoint = null;
      if (!a || !point || !total) return;
      const factor = clamp(Math.exp(-total * (wheelCtrl ? .0025 : .0012)), .92, 1.18);
      const base = wheelTarget ? wheelTarget.z : a.crop.z;
      wheelTarget = { z: clamp(base * factor, 1, 4), x: point.x, y: point.y };
      if (!wheelAnim) wheelAnim = requestAnimationFrame(stepWheelGlide);
    });
  }, { passive: false });

  stage.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const now = performance.now();
    if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 26) {
      lastTap = null;
      const a = photo();
      if (!a) return;
      if (a.crop.z < 1.5) zoomTo(2, e.clientX, e.clientY);
      else resetCrop();
    } else {
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  });

  stage.addEventListener('dblclick', (e) => {
    const a = photo();
    if (!a) return;
    if (a.crop.z < 1.5) zoomTo(2, e.clientX, e.clientY);
    else resetCrop();
  });

  stage.addEventListener('keydown', (e) => {
    const a = photo();
    if (!a) return;
    const step = e.shiftKey ? 28 : 10;
    if (e.key === 'ArrowLeft') { e.preventDefault(); panBy(step, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); panBy(-step, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); panBy(0, step); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); panBy(0, -step); }
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomTo(a.crop.z * 1.08, r.left + r.width / 2, r.top + r.height / 2); }
    else if (e.key === '-') { e.preventDefault(); const r = stage.getBoundingClientRect(); zoomTo(a.crop.z / 1.08, r.left + r.width / 2, r.top + r.height / 2); }
    else if (e.key === '0') { e.preventDefault(); resetCrop(); }
  });

  film.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-film]');
    if (btn) select(Number(btn.dataset.film));
  });

  ratioSeg.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-v]');
    if (!btn) return;
    comp.ratio = btn.dataset.v;
    $$('#crop-ratio button', el).forEach((b) => b.classList.toggle('on', b.dataset.v === comp.ratio));
    layout();
    renderFilm();
    comp.saveDraft();
  });

  zoom.addEventListener('input', () => {
    cancelWheelGlide();
    const value = Number(zoom.value) || 1;
    zoom.style.setProperty('--p', ((value - 1) / 3).toFixed(4));
    if (sliderFrame) return;
    sliderFrame = requestAnimationFrame(() => {
      sliderFrame = 0;
      const a = photo();
      if (!a) return;
      const rect = stageRect || stage.getBoundingClientRect();
      zoomTo(Number(zoom.value) || 1, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
  });

  $('#crop-done', el).addEventListener('click', () => history.back());

  const onResize = () => layout();
  addEventListener('resize', onResize);
  cleanupResize = () => removeEventListener('resize', onResize);

  activeCrop = { entry, select };
  renderFilm();
  requestAnimationFrame(() => {
    layout();
    stage.focus({ preventScroll: true });
  });
  return activeCrop;
}


let activeAvatarCrop = null;

function openAvatarCrop(avatar, onConfirm, onCancel) {
  if (!avatar || !avatar.m) return null;
  if (activeAvatarCrop && activeAvatarCrop.entry.el.isConnected) return activeAvatarCrop;

  const crop = normalizeCrop(avatar.crop);
  let confirmed = false;
  let stageRect = null;
  let cleanupResize = null;
  let panFrame = 0;
  let zoomFrame = 0;
  let sliderFrame = 0;
  let panQueue = null;
  let zoomQueue = null;
  const pointers = new Map();
  let pan = null;
  let pinch = null;
  let lastTap = null;

  const image = () => ({ m: avatar.m, w: avatar.w, h: avatar.h, crop });

  const entry = mountLayer(`
    <header class="layer-h">
      <button class="icon-btn" type="button" data-act="close" aria-label="Back">${icon('arrow-left')}</button>
      <h2>Crop photo</h2>
    </header>
    <div class="layer-body crop-body">
      <div class="crop-stage-wrap" id="avatar-crop-wrap">
        <div class="crop-stage" id="avatar-crop-stage" tabindex="0" aria-label="Crop profile photo"></div>
      </div>
      <div class="crop-bottom">
        <input class="crop-zoom" id="avatar-crop-zoom" type="range" min="1" max="4" step=".01" value="1" aria-label="Zoom photo">
        <button class="btn block crop-done" id="avatar-crop-done" type="button">Use photo</button>
      </div>
    </div>
  `, {
    up: true,
    cls: 'crop-layer avatar-crop-layer',
    descriptor: { type: 'avatar-crop', id: avatar.m },
    onClose() {
      cancelFrames();
      if (cleanupResize) cleanupResize();
      activeAvatarCrop = null;
      if (!confirmed && onCancel) onCancel();
    }
  });

  const el = entry.el;
  const wrap = $('#avatar-crop-wrap', el);
  const stage = $('#avatar-crop-stage', el);
  const zoom = $('#avatar-crop-zoom', el);
  if (!wrap || !stage || !zoom) return entry;

  function syncZoom() {
    zoom.value = String(crop.z);
    zoom.style.setProperty('--p', ((crop.z - 1) / 3).toFixed(4));
  }

  function updateImage() {
    const img = stage.querySelector('img');
    if (!img) return;
    const m = cropMetrics(image(), '1 / 1');
    img.style.transform = `translate3d(-50%,-50%,0) translate3d(${m.px}%,${m.py}%,0) scale(${m.z})`;
    syncZoom();
  }

  function layout() {
    const cs = getComputedStyle(wrap);
    const availW = Math.max(80, wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
    const availH = Math.max(80, wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
    const size = Math.round(Math.max(80, Math.min(availW, availH)));
    stage.style.width = size + 'px';
    stage.style.height = size + 'px';
    stage.innerHTML = editorImg(image(), '1 / 1');
    hydrate(stage);
    stageRect = stage.getBoundingClientRect();
    syncZoom();
  }

  function panBy(dx, dy) {
    const rect = stageRect || stage.getBoundingClientRect();
    const m = cropMetrics(image(), '1 / 1');
    const maxX = (m.w / 100 * rect.width - rect.width) / 2;
    const maxY = (m.h / 100 * rect.height - rect.height) / 2;
    if (maxX > .5) crop.x = clamp(crop.x + dx / maxX, -1, 1);
    if (maxY > .5) crop.y = clamp(crop.y + dy / maxY, -1, 1);
    updateImage();
  }

  function zoomAt(z, clientX, clientY) {
    const rect = stageRect || stage.getBoundingClientRect();
    const qx = clientX - (rect.left + rect.width / 2);
    const qy = clientY - (rect.top + rect.height / 2);
    const before = cropMetrics(image(), '1 / 1');
    const sx = before.w / 100 * rect.width;
    const sy = before.h / 100 * rect.height;
    const panX = before.x * (sx - rect.width) / 2;
    const panY = before.y * (sy - rect.height) / 2;
    const ux = sx > 0 ? (qx - panX) / sx : 0;
    const uy = sy > 0 ? (qy - panY) / sy : 0;
    crop.z = clamp(z, 1, 4);
    const after = cropMetrics(image(), '1 / 1');
    const sx2 = after.w / 100 * rect.width;
    const sy2 = after.h / 100 * rect.height;
    const panX2 = qx - ux * sx2;
    const panY2 = qy - uy * sy2;
    const maxX = (sx2 - rect.width) / 2;
    const maxY = (sy2 - rect.height) / 2;
    crop.x = maxX > .5 ? clamp(panX2 / maxX, -1, 1) : 0;
    crop.y = maxY > .5 ? clamp(panY2 / maxY, -1, 1) : 0;
    updateImage();
  }

  function resetCrop() {
    crop.x = 0;
    crop.y = 0;
    crop.z = 1;
    updateImage();
  }

  function queuePan(dx, dy) {
    if (!panQueue) panQueue = { dx: 0, dy: 0 };
    panQueue.dx += dx;
    panQueue.dy += dy;
    if (panFrame) return;
    panFrame = requestAnimationFrame(() => {
      panFrame = 0;
      const q = panQueue;
      panQueue = null;
      if (q) panBy(q.dx, q.dy);
    });
  }

  function flushPan() {
    if (panFrame) { cancelAnimationFrame(panFrame); panFrame = 0; }
    const q = panQueue;
    panQueue = null;
    if (q) panBy(q.dx, q.dy);
  }

  function queueZoom(z, x, y) {
    zoomQueue = { z, x, y };
    if (zoomFrame) return;
    zoomFrame = requestAnimationFrame(() => {
      zoomFrame = 0;
      const q = zoomQueue;
      zoomQueue = null;
      if (q) zoomAt(q.z, q.x, q.y);
    });
  }

  function flushZoom() {
    if (zoomFrame) { cancelAnimationFrame(zoomFrame); zoomFrame = 0; }
    const q = zoomQueue;
    zoomQueue = null;
    if (q) zoomAt(q.z, q.x, q.y);
  }

  function cancelFrames() {
    if (panFrame) cancelAnimationFrame(panFrame);
    if (zoomFrame) cancelAnimationFrame(zoomFrame);
    if (sliderFrame) cancelAnimationFrame(sliderFrame);
    panFrame = zoomFrame = sliderFrame = 0;
    panQueue = zoomQueue = null;
  }

  function startPinch() {
    const pts = Array.from(pointers.values());
    if (pts.length < 2) return;
    pinch = {
      dist: Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)),
      z: crop.z
    };
  }

  stage.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { stage.setPointerCapture(e.pointerId); } catch (err) {}
    stageRect = stage.getBoundingClientRect();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 1) {
      pan = { x: e.clientX, y: e.clientY };
      pinch = null;
    } else if (pointers.size === 2) {
      pan = null;
      startPinch();
    }
  });

  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.max(1, Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y));
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      queueZoom(pinch.z * dist / pinch.dist, mid.x, mid.y);
    } else if (pan && pointers.size === 1) {
      queuePan(e.clientX - pan.x, e.clientY - pan.y);
      pan = { x: e.clientX, y: e.clientY };
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    flushPan();
    flushZoom();
    if (pointers.size === 1) {
      const only = Array.from(pointers.values())[0];
      pan = { x: only.x, y: only.y };
      pinch = null;
    } else if (!pointers.size) {
      pan = null;
      pinch = null;
    }
  }
  stage.addEventListener('pointerup', endPointer);
  stage.addEventListener('pointercancel', endPointer);

  stage.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse') return;
    const now = performance.now();
    if (lastTap && now - lastTap.t < 300 && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 26) {
      lastTap = null;
      if (crop.z < 1.5) zoomAt(2, e.clientX, e.clientY);
      else resetCrop();
    } else {
      lastTap = { t: now, x: e.clientX, y: e.clientY };
    }
  });

  stage.addEventListener('dblclick', (e) => {
    if (crop.z < 1.5) zoomAt(2, e.clientX, e.clientY);
    else resetCrop();
  });

  stage.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 320 : e.deltaY;
    const factor = clamp(Math.exp(-delta * .0012), .92, 1.18);
    zoomAt(crop.z * factor, e.clientX, e.clientY);
  }, { passive: false });

  stage.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 28 : 10;
    if (e.key === 'ArrowLeft') { e.preventDefault(); panBy(step, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); panBy(-step, 0); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); panBy(0, step); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); panBy(0, -step); }
    else if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(crop.z * 1.08, r.left + r.width / 2, r.top + r.height / 2);
    } else if (e.key === '-') {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(crop.z / 1.08, r.left + r.width / 2, r.top + r.height / 2);
    } else if (e.key === '0') {
      e.preventDefault();
      resetCrop();
    }
  });

  zoom.addEventListener('input', () => {
    const value = Number(zoom.value) || 1;
    zoom.style.setProperty('--p', ((value - 1) / 3).toFixed(4));
    if (sliderFrame) return;
    sliderFrame = requestAnimationFrame(() => {
      sliderFrame = 0;
      const r = stageRect || stage.getBoundingClientRect();
      zoomAt(Number(zoom.value) || 1, r.left + r.width / 2, r.top + r.height / 2);
    });
  });

  $('#avatar-crop-done', el).addEventListener('click', () => {
    confirmed = true;
    if (onConfirm) onConfirm({ ...avatar, crop: normalizeCrop(crop) });
    history.back();
  });

  const onResize = () => layout();
  addEventListener('resize', onResize);
  cleanupResize = () => removeEventListener('resize', onResize);

  activeAvatarCrop = { entry };
  requestAnimationFrame(() => {
    layout();
    stage.focus({ preventScroll: true });
  });
  return activeAvatarCrop;
}

/* ------------------------------------------------------------------ edit profile */

function openEdit(restore) {
  const me = state.me;
  const draft = restore && restore.draft && typeof restore.draft === 'object' ? restore.draft : null;
  const name = draft && typeof draft.name === 'string' ? draft.name.slice(0, 40) : me.name;
  const handle = draft && typeof draft.handle === 'string' ? draft.handle.slice(0, HANDLE_MAX) : me.handle;
  const bio = draft && typeof draft.bio === 'string' ? draft.bio.slice(0, 160) : me.bio;
  const oldAvatar = me.avatar;
  let pendingAvatar = me.avatar;
  let pendingUpload = null;
  let saved = false;
  let closed = false;
  const entry = mountLayer(`
    ${layerHead('Edit profile', '<button class="btn sm" id="save-profile" type="button">Save</button>')}
    <form class="layer-body edit" id="edit-form">
      <div class="avatar-edit">
        <div id="edit-av">${av(me, 64)}</div>
        <div class="avatar-actions">
          <label class="btn ghost avatar-action">${icon('image')}Change photo<input id="edit-avatar-file" type="file" accept="image/*" hidden></label>
          <button class="btn ghost avatar-action" id="remove-avatar" type="button"${pendingAvatar ? '' : ' hidden'}>${icon('trash-2')}Remove photo</button>
        </div>
      </div>
      <div>
        <label class="lbl" for="edit-name">Name</label>
        <input class="field" id="edit-name" name="display" maxlength="40" value="${esc(name)}" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other">
      </div>
      <div>
        <label class="lbl" for="edit-handle">Handle</label>
        <div class="handle-wrap">
          <span class="handle-at" aria-hidden="true">@</span>
          <input class="field handle-field" id="edit-handle" name="handle" maxlength="${HANDLE_MAX}" pattern="[a-z_.\\-]*" value="${esc(handle)}" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" aria-autocomplete="none" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other">
        </div>
      </div>
      <div>
        <label class="lbl" for="edit-bio">Bio</label>
        <textarea class="field bio" id="edit-bio" name="bio" maxlength="160" autocomplete="off" autocorrect="off" autocapitalize="sentences" spellcheck="true" data-lpignore="true" data-1p-ignore data-bwignore data-form-type="other">${esc(bio)}</textarea>
      </div>
    </form>
  `, {
    cls: 'edit-layer',
    descriptor: { type: 'edit' },
    capture() {
      return {
        draft: {
          name: $('#edit-name', entry.el) ? $('#edit-name', entry.el).value.slice(0, 40) : name,
          handle: $('#edit-handle', entry.el) ? slug($('#edit-handle', entry.el).value) : handle,
          bio: $('#edit-bio', entry.el) ? $('#edit-bio', entry.el).value.slice(0, 160) : bio
        }
      };
    },
    onClose() {
      closed = true;
      if (!saved && pendingUpload) discardMedia(pendingUpload.m);
    }
  });

  const el = entry.el;
  const form = $('#edit-form', el);
  const handleInput = $('#edit-handle', el);
  const removeBtn = $('#remove-avatar', el);
  const saveBtn = $('#save-profile', el);

  function updateAvatarPreview() {
    const box = $('#edit-av', el);
    if (box) {
      box.innerHTML = av({ ...me, avatar: pendingAvatar }, 64);
      hydrate(box);
    }
    if (removeBtn) removeBtn.hidden = !pendingAvatar;
  }

  handleInput.addEventListener('input', () => {
    const raw = handleInput.value;
    const pos = handleInput.selectionStart ?? raw.length;
    const next = slug(raw);
    if (next === raw) return;
    const before = slug(raw.slice(0, pos));
    handleInput.value = next;
    const caret = Math.min(next.length, before.length);
    handleInput.setSelectionRange(caret, caret);
  });

  $('#save-profile', el).addEventListener('click', () => form.requestSubmit());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saveBtn.disabled) return;
    saveBtn.disabled = true;
    let nextAvatar = pendingAvatar;
    if (pendingAvatar !== oldAvatar && pendingAvatar && pendingAvatar.m) {
      processShow(1);
      let baked = null;
      try { baked = await bakeCrop(pendingAvatar, '1 / 1', 512); }
      finally { processHide(); }
      if (!baked) {
        saveBtn.disabled = false;
        toast("That photo couldn't be cropped.");
        return;
      }
      let data = '';
      try {
        const blob = await idbGet(baked.m);
        if (blob) data = await blobToDataURL(blob);
      } catch (err) {}
      nextAvatar = { m: baked.m, w: baked.w, h: baked.h, d: data || undefined };
      if (pendingUpload) {
        discardMedia(pendingUpload.m);
        pendingUpload = null;
      }
    }
    me.name = ($('#edit-name', el).value.trim() || me.name).slice(0, 40);
    me.handle = slug($('#edit-handle', el).value) || me.handle;
    me.bio = $('#edit-bio', el).value.trim().slice(0, 160);
    if (nextAvatar !== oldAvatar) {
      if (oldAvatar && oldAvatar.m && (!nextAvatar || nextAvatar.m !== oldAvatar.m)) discardMedia(oldAvatar.m);
      me.avatar = nextAvatar;
    }
    saved = true;
    save();
    renderFeed();
    renderExplore();
    renderProfile();
    history.back();
    toast('Profile updated');
  });

  removeBtn.addEventListener('click', () => {
    if (pendingUpload) {
      discardMedia(pendingUpload.m);
      pendingUpload = null;
    }
    pendingAvatar = null;
    updateAvatarPreview();
  });

  $('#edit-avatar-file', el).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    processShow(1);
    let im = null;
    try { im = await compressImage(file, 512, .86); }
    finally { processHide(); }
    if (!im) { toast("That photo didn't load."); return; }
    if (closed) { discardMedia(im.m); return; }
    let data = '';
    try {
      const blob = await idbGet(im.m);
      if (blob) data = await blobToDataURL(blob);
    } catch (e) {}
    if (closed) { discardMedia(im.m); return; }
    const candidate = { m: im.m, w: im.w, h: im.h, d: data || undefined };
    openAvatarCrop(candidate, (next) => {
      if (pendingUpload && pendingUpload.m !== next.m) discardMedia(pendingUpload.m);
      pendingUpload = next;
      pendingAvatar = next;
      updateAvatarPreview();
      toast('Press Save to keep this photo.');
    }, () => {
      discardMedia(candidate.m);
    });
  });
}

/* ------------------------------------------------------------------ settings */

function openSettings() {
  const t = state.theme;
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  mountLayer(`
    ${layerHead('Settings')}
    <div class="layer-body">
      <div class="setting-h">Appearance</div>
      <div class="seg three inset" id="theme-seg">
        <button class="${t === 'auto' ? 'on' : ''}" type="button" data-act="theme" data-v="auto">System</button>
        <button class="${t === 'light' ? 'on' : ''}" type="button" data-act="theme" data-v="light">Light</button>
        <button class="${t === 'dark' ? 'on' : ''}" type="button" data-act="theme" data-v="dark">Dark</button>
      </div>
      <div class="setting-h">Your profile (only visible to you)</div>
      <button class="row" type="button" data-act="saved">${icon('lock')} Saved posts<span class="chev">${icon('chevron-right')}</span></button>
      <button class="row" type="button" data-act="liked">${icon('lock')} Liked posts<span class="chev">${icon('chevron-right')}</span></button>
      <button class="row" type="button" data-act="comments">${icon('lock')} Comments<span class="chev">${icon('chevron-right')}</span></button>
      <div class="setting-h">App</div>
      <button class="row" type="button" data-act="shortcuts">${icon('keyboard')} Keyboard shortcuts<span class="chev">${icon('chevron-right')}</span></button>
      ${installed ? '' : `<button class="row" type="button" data-act="install">${icon('download')} Install app<span class="chev">${icon('chevron-right')}</span></button>`}
      <button class="row" type="button" data-act="reset">${icon('rotate-ccw')} Reset demo<span class="chev">${icon('chevron-right')}</span></button>
      <button class="row" type="button" data-act="logout">${icon('log-out')} Sign out<span class="chev">${icon('chevron-right')}</span></button>
      <p class="fineprint pad">Koinara ${APP_VERSION}. A text-first social demo.</p>
    </div>
  `, { cls: 'settings-layer', descriptor: { type: 'settings' } });
}

function setTheme(v) {
  state.theme = v;
  save();
  applyTheme();
  $$('#theme-seg button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
}

async function resetDemo() {
  const auth = state.auth;
  const theme = state.theme;
  state = seedState();
  state.auth = auth;
  state.theme = theme;
  if (auth) {
    state.me.name = auth.name;
    state.me.handle = auth.handle;
  }
  profileTab = 'posts';
  exploreQuery = '';
  save();
  clearLayers();
  ui.scrolls = {};
  ui.explore = '';
  ui.profileTab = 'posts';
  ui.layers = [];
  ui.composeDraft = null;
  saveUI();
  const search = $('#explore-search');
  if (search) search.value = '';
  for (const url of urlCache.values()) URL.revokeObjectURL(url);
  urlCache.clear();
  renderAll();
  setTab('feed', { top: true });
  const feed = $('#view-feed');
  if (feed) feed.scrollTop = 0;
  toast('Demo reset');
  try { await idbClear(); } catch (e) {}
}

function openConfirm(kind) {
  const copy = {
    reset: {
      title: 'Reset demo',
      message: 'This clears every post, reply, photo and chat you created on this device, then restores the demo.',
      label: 'Reset demo'
    },
    logout: {
      title: 'Sign out',
      message: 'Your demo data stays on this device.',
      label: 'Sign out'
    },
    discard: {
      title: 'Discard draft',
      message: 'This removes the text and photos from this draft.',
      label: 'Discard'
    }
  }[kind] || null;
  if (!copy) return;
  confirmAction = () => {
    if (kind === 'reset') resetDemo();
    else if (kind === 'logout') signOut();
    else if (kind === 'discard') {
      if (activeCompose) activeCompose.discardNow();
      if (activeCompose || layers.length > 1) history.go(-2);
      else history.back();
    }
  };

  mountLayer(`
    ${layerHead(copy.title, '', 'x')}
    <div class="layer-body">
      <div class="confirm">
        <p>${esc(copy.message)}</p>
        <button class="btn block" type="button" data-act="do-confirm">${esc(copy.label)}</button>
        <button class="btn block ghost" type="button" data-act="close">Cancel</button>
      </div>
    </div>
  `, { cls: 'confirm-layer', descriptor: { type: 'confirm', kind } });
}

/* ------------------------------------------------------------------ theme & tabs */

const mq = matchMedia('(prefers-color-scheme: dark)');

function applyTheme() {
  const dark = state.theme === 'dark' || (state.theme === 'auto' && mq.matches);
  const scheme = dark ? 'dark' : 'light';
  document.documentElement.dataset.theme = scheme;
  document.documentElement.style.colorScheme = scheme;
  document.documentElement.style.backgroundColor = dark ? '#0b0b0a' : '#f4f4f1';
  const lightMeta = document.querySelector('meta[name="theme-color"][data-theme-color="light"]');
  const darkMeta = document.querySelector('meta[name="theme-color"][data-theme-color="dark"]');
  if (lightMeta && darkMeta) {
    if (state.theme === 'auto') {
      lightMeta.media = '(prefers-color-scheme: light)';
      darkMeta.media = '(prefers-color-scheme: dark)';
    } else {
      lightMeta.media = dark ? 'not all' : 'all';
      darkMeta.media = dark ? 'all' : 'not all';
    }
  }
  const schemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (schemeMeta) schemeMeta.content = scheme;
  const barMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (barMeta) barMeta.content = dark ? 'black-translucent' : 'default';
}

const viewEl = (name) => $('#view-' + name);

const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => reducedQuery.matches;

function swapIn(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove('swap-in');
  void el.offsetWidth;
  el.classList.add('swap-in');
  setTimeout(() => el.classList.remove('swap-in'), 340);
}

function switchTab(name, opts = {}) {
  const view = viewEl(name);
  if (!view) return false;
  const prevName = currentTab;
  const prev = prevName && viewEl(prevName);
  if (prev) ui.scrolls[prevName] = prev.scrollTop;

  if (name === prevName) {
    if (opts.keepScroll) view.scrollTop = opts.scroll != null ? opts.scroll : (ui.scrolls[name] || 0);
    else {
      view.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
      ui.scrolls[name] = 0;
    }
    ui.tab = name;
    scheduleScrollbar();
    return false;
  }

  const direction = opts.direction || (TABS.indexOf(name) > TABS.indexOf(prevName || 'feed') ? 'forward' : 'back');
  currentTab = name;

  $$('.view').forEach((v) => {
    v.classList.remove('tab-enter', 'tab-leave', 'back');
    v.style.transform = '';
    v.style.opacity = '';
  });

  const top = opts.top ? 0 : (opts.scroll != null ? opts.scroll : (ui.scrolls[name] || 0));
  view.scrollTop = top;
  ui.tab = name;
  ui.scrolls[name] = top;

  $$('.tab, .sidenav-item').forEach((b) => {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });

  syncInert();
  tabTransitioning = true;
  scrollIndicator.classList.remove('on');

  const animate = prev && opts.animate !== false && !opts.noAnimate && !reducedMotion();
  if (animate) {
    prev.classList.add('tab-leave');
    view.classList.add('tab-enter');
    if (direction === 'back') {
      prev.classList.add('back');
      view.classList.add('back');
    }
    clearTimeout(tabTimer);
    tabTimer = setTimeout(() => {
      tabTransitioning = false;
      prev.classList.remove('tab-leave', 'back');
      view.classList.remove('tab-enter', 'back');
      scheduleScrollbar();
    }, matchMedia('(min-width: 900px)').matches ? 440 : 360);
  } else {
    tabTransitioning = false;
    scheduleScrollbar();
  }

  return true;
}

function setTab(name, opts = {}) {
  const view = viewEl(name);
  if (!view) return;

  if (name === currentTab) {
    if (!opts.keepLayers && layers.length) {
      closeAllLayers({ animate: opts.animate !== false && !opts.noAnimate, restore: false });
      // Tapping the active tab (or posting from it) pops to that tab's root.
      // Consume the layer entries so Back does not reopen a finished flow.
      if (!navApplying) {
        try { history.replaceState(navSnapshot(navIndex, []), ''); } catch (e) {}
      }
    }
    switchTab(name, opts);
    ui.tab = name;
    saveUI();
    return;
  }

  if (!opts.keepLayers) closeAllLayers({ animate: opts.animate !== false && !opts.noAnimate, restore: false });
  switchTab(name, opts);
  saveUI();
  if (!opts.noHistory && !navApplying) pushNav();
}

function setExploreQuery(q) {
  clearTimeout(exploreTimer);
  const input = $('#explore-search');
  if (input) input.value = q;
  exploreQuery = q;
  ui.explore = q;
  saveUI();
  renderExplore();
  const view = $('#view-explore');
  if (view) view.scrollTop = 0;
}

/* ------------------------------------------------------------------ login */

function identityFrom(raw) {
  const value = String(raw || '').trim();
  let local = value.includes('@') ? value.split('@')[0] : value;
  local = local.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  const name = (local ? local.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Guest').slice(0, 40) || 'Guest';
  return { name, handle: slug(name) || 'guest' };
}

function login(rawId) {
  const id = identityFrom(rawId);
  state.me.name = id.name;
  state.me.handle = id.handle;
  state.auth = id;
  save();

  renderAll();
  setTab('feed', { keepScroll: true, noHistory: true, animate: false });
  $('#shell').hidden = false;
  resetNav();

  const screen = $('#login');
  screen.classList.add('leaving');
  setTimeout(() => {
    screen.hidden = true;
    screen.classList.remove('leaving');
    document.documentElement.classList.add('authed');
    handleQuery();
  }, 180);
}

function showLogin() {
  document.documentElement.classList.remove('authed');
  $('#shell').hidden = true;
  $('#login').hidden = false;
  $('#login').classList.remove('leaving');
  ui.layers = [];
  applyTheme();
}

function signOut() {
  state.auth = null;
  save();
  clearLayers();
  ui.tab = 'feed';
  ui.scrolls = {};
  ui.explore = '';
  ui.profileTab = 'posts';
  ui.layers = [];
  saveUI();
  const search = $('#explore-search');
  if (search) search.value = '';
  showLogin();
  toast('Signed out');
}

/* ------------------------------------------------------------------ install */

let deferredPrompt = null;

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

addEventListener('appinstalled', () => {
  deferredPrompt = null;
  document.documentElement.classList.add('standalone');
  toast('Koinara installed');
});

function installApp() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) { toast('Already installed'); return; }
  if (deferredPrompt) {
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(() => { deferredPrompt = null; }).catch(() => {});
    return;
  }
  toast('Open the browser menu and choose "Add to Home Screen".');
}

/* ------------------------------------------------------------------ events */

function bindEvents() {
  // Keep browser image and link menus out of the app shell.
  document.addEventListener('contextmenu', (e) => {
    const el = e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"], .msg, .reply-text, .p-bio, .post-text, .preview-text, .selectable');
    if (el) return;
    e.preventDefault();
  });
  document.addEventListener('dragstart', (e) => {
    if (e.target.closest && e.target.closest('img')) e.preventDefault();
  });

  $('#login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    login($('#login-id').value);
  });

  $('#demo-btn').addEventListener('click', () => {
    $('#login-id').value = 'alex@koinara.app';
    $('#login-form').requestSubmit();
  });

  $$('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => setTab(tab.dataset.tab));
  });


  $('#explore-search').addEventListener('input', (e) => {
    const q = e.target.value;
    clearTimeout(exploreTimer);
    exploreTimer = setTimeout(() => {
      exploreQuery = q;
      ui.explore = q;
      saveUI();
      renderExplore();
    }, 110);
  });
  $('#explore-search').addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && e.target.value) {
      e.preventDefault();
      setExploreQuery('');
    }
  });

  let holdTimer = 0;
  let holdOrigin = null;
  let holdReply = null;
  let holdFired = false;

  const cancelHold = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = 0;
    holdOrigin = null;
    holdReply = null;
  };

  const swallowNextClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  document.addEventListener('contextmenu', (e) => {
    if (matchMedia('(pointer: coarse)').matches && e.target.closest && e.target.closest('.reply-body, .comment-item')) e.preventDefault();
  });

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest && e.target.closest('.reply-act, .reply-acts, .comment-acts, .action-sheet')) return;
    const body = e.target.closest && e.target.closest('.reply-body');
    const item = body ? null : (e.target.closest && e.target.closest('.comment-item'));
    const holder = body || item;
    if (!holder) return;
    const postId = holder.dataset.post;
    const replyId = body ? holder.dataset.id : holder.dataset.reply;
    const reply = replyById(postId, replyId);
    if (!reply || reply.userId !== 'me') return;
    cancelHold();
    holdFired = false;
    holdOrigin = { x: e.clientX, y: e.clientY };
    holdReply = { postId, replyId };
    holdTimer = setTimeout(() => {
      holdTimer = 0;
      holdFired = true;
      const target = holdReply;
      holdOrigin = null;
      holdReply = null;
      if (!target) return;
      const selection = window.getSelection();
      if (selection) selection.removeAllRanges();
      openCommentMenu(target.postId, target.replyId);
    }, 500);
  }, { passive: true });

  document.addEventListener('pointermove', (e) => {
    if (!holdOrigin) return;
    if (Math.hypot(e.clientX - holdOrigin.x, e.clientY - holdOrigin.y) > 8) cancelHold();
  }, { passive: true });

  document.addEventListener('pointerup', () => {
    const fired = holdFired;
    holdFired = false;
    cancelHold();
    if (!fired) return;
    document.addEventListener('click', swallowNextClick, { capture: true, once: true });
    setTimeout(() => document.removeEventListener('click', swallowNextClick, { capture: true }), 350);
  }, { passive: true });

  document.addEventListener('pointercancel', () => {
    holdFired = false;
    cancelHold();
  }, { passive: true });

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.closest('.layer.closing')) return;
    const act = el.dataset.act;
    const id = el.dataset.id;

    switch (act) {
      case 'compose': openCompose(); break;
      case 'settings': openSettings(); break;
      case 'shortcuts': openShortcuts(); break;
      case 'close': if (layers.length) history.back(); break;
      case 'open': openPost(id); break;
      case 'avatar': openAvatarView(id, el); break;
      case 'post-menu': openPostMenu(id); break;
      case 'edit-post': closeSheetThen(() => openCompose({ postId: id })); break;
      case 'like': toggleLike(id, el); break;
      case 'bookmark': toggleBookmark(id, el); break;
      case 'share': sharePost(id); break;
      case 'profile': openProfileById(id); break;
      case 'chat': openChat(id); break;
      case 'edit': openEdit(); break;
      case 'ptab':
        setProfileTab(el.dataset.v);
        break;
      case 'theme': setTheme(el.dataset.v); break;
      case 'install': installApp(); break;
      case 'reset':
        openConfirm('reset');
        break;
      case 'logout':
        openConfirm('logout');
        break;
      case 'do-confirm': {
        const fn = confirmAction;
        confirmAction = null;
        if (fn) fn();
        break;
      }
      case 'replyfocus': {
        const layer = el.closest('.layer');
        const entry = layer && layers.find((e) => e.el === layer);
        if (entry && entry.clearReplyTo) entry.clearReplyTo(true);
        const input = layer && layer.querySelector('#reply-form .field');
        if (input) input.focus();
        break;
      }
      case 'reply-like': toggleReplyLike(el.dataset.post, id, el); break;
      case 'reply-to': focusReplyTarget(el.dataset.post, id); break;
      case 'thread-open': openThread(el.dataset.post, el.dataset.root); break;
      case 'thread-collapse': collapseThread(el.dataset.post, el.dataset.root); break;
      case 'thread-more': moreThread(el.dataset.post, el.dataset.root); break;
      case 'comment-menu-delete': showCommentMenuView(el.closest('.action-sheet'), 'confirm'); break;
      case 'comment-menu-back': showCommentMenuView(el.closest('.action-sheet'), 'actions'); break;
      case 'comment-menu-confirm':
        deleteReply(el.dataset.post, id);
        if (layers.length) history.back();
        break;
      case 'reply-cancel': {
        const layer = el.closest('.layer');
        const entry = layers.find((e) => e.el === layer);
        if (entry && entry.clearReplyTo) entry.clearReplyTo(true);
        break;
      }
      case 'explore-more': {
        const kind = el.dataset.kind;
        const offset = Number(el.dataset.offset) || 0;
        const batch = kind === 'discover' ? 6 : (kind === 'people' ? 5 : 12);
        const root = kind === 'discover' ? $('#explore-discover-list')
          : (kind === 'people' ? $('#explore-people-list') : $('#explore-search-list'));
        const pool = kind === 'discover' ? discoverPosts()
          : (kind === 'people' ? searchPeople(exploreQuery) : searchPosts(exploreQuery));
        const next = pool.slice(offset, offset + batch);
        if (!root || !next.length) { el.remove(); break; }
        root.insertAdjacentHTML('beforeend', next.map((row) => kind === 'people' ? personRow(row) : postCard(row)).join(''));
        hydrate(root);
        el.dataset.offset = String(offset + next.length);
        if (offset + next.length >= pool.length) el.remove();
        scheduleScrollbar();
        break;
      }
      case 'clear-search':
        setExploreQuery('');
        $('#explore-search').focus();
        break;
      case 'tag':
        setExploreQuery(el.dataset.q || '');
        setTab('explore', { top: true });
        break;
      case 'people': openPeopleList(id, el.dataset.kind); break;
      case 'follow': toggleFollow(id); break;
      case 'saved': openSavedPosts(); break;
      case 'liked': openLikedPosts(); break;
      case 'comments': openMyComments(); break;
      case 'goto-explore': setTab('explore'); break;
      case 'cdots': {
        const car = el.closest('[data-carousel]');
        if (car) carouselGo(car, Number(el.dataset.i || 0));
        break;
      }
    }
  });

  addEventListener('popstate', (e) => {
    if (currentKeyboardHeight > 0) {
      const active = document.activeElement;
      if (isTextInput(active) && active.blur) active.blur();
      setKeyboardTarget(0);
      try { history.pushState(navSnapshot(navIndex), ''); } catch (err) {}
      return;
    }
    const snap = e.state;
    if (!state.auth) {
      if (!snap || !snap.tab) showLogin();
      return;
    }
    if (!snap || snap.koinara !== 2) {
      if (snap && Array.isArray(snap.stack)) syncHistory(snap.stack, { animate: true });
      return;
    }
    const direction = snap.index < navIndex ? 'back' : 'forward';
    navIndex = snap.index;
    applyNav(snap, direction);
  });

  addEventListener('keydown', (e) => {
    keyboardMode = true;
    const active = document.activeElement;
    const typing = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
    if (e.key === 'Escape') {
      if (typing) {
        e.preventDefault();
        active.blur();
        return;
      }
      if (layers.length) {
        e.preventDefault();
        history.back();
        return;
      }
    }
    if ($('#shell').hidden) return;
    if (typing || layers.length || e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === 'Escape') {
      const post = activePostEl();
      if (post) {
        e.preventDefault();
        post.classList.remove('is-focus');
        post.blur();
      }
      return;
    }

    if (e.key === '?') {
      e.preventDefault();
      openShortcuts();
      return;
    }
    if (e.key === ',') {
      e.preventDefault();
      openSettings();
      return;
    }
    if (e.key === 'n') {
      e.preventDefault();
      openCompose();
      return;
    }
    if (e.key === '/') {
      e.preventDefault();
      setTab('explore', { keepScroll: true });
      const search = $('#explore-search');
      if (search) { search.focus(); search.select(); }
      return;
    }
    if (['1', '2', '3', '4'].includes(e.key)) {
      e.preventDefault();
      setTab(['feed', 'explore', 'chat', 'profile'][Number(e.key) - 1], { keepScroll: true });
      return;
    }

    if (e.key === 'j') {
      e.preventDefault();
      stepPost(1);
      return;
    }
    if (e.key === 'k') {
      e.preventDefault();
      stepPost(-1);
      return;
    }

    const post = activePostEl();
    if (!post) return;
    const id = post.dataset.post;
    const onCard = active === post;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      stepPost(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      stepPost(-1);
    } else if (onCard && (e.key === 'Enter' || e.key === 'o')) {
      e.preventDefault();
      openPost(id);
    } else if (e.key === 'l') {
      e.preventDefault();
      toggleLike(id, post.querySelector('[data-act="like"]'));
    } else if (e.key === 'b') {
      e.preventDefault();
      toggleBookmark(id, post.querySelector('[data-act="bookmark"]'));
    } else if (e.key === 's') {
      e.preventDefault();
      sharePost(id);
    } else if (e.key === 'r') {
      e.preventDefault();
      openPost(id);
      setTimeout(() => {
        const input = $('#reply-form .field');
        if (input) input.focus({ preventScroll: true });
      }, 300);
    }
  });

  document.addEventListener('focusout', (e) => {
    const post = e.target && e.target.closest && e.target.closest('.post[data-post]');
    if (post && !post.contains(e.relatedTarget)) post.classList.remove('is-focus');
  });

  document.addEventListener('pointerdown', () => {
    keyboardMode = false;
    $$('.post.is-focus').forEach((el) => el.classList.remove('is-focus'));
  }, true);

  mq.addEventListener('change', () => {
    if (state.theme === 'auto') applyTheme();
  });

  addEventListener('offline', () => toast('Offline. Koinara still works'));
  addEventListener('online', () => toast('Back online'));

  bindPostGestures();
  bindGestures();
}

function bindPostGestures() {
  let down = null;
  let lastTap = null;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    down = { x: e.clientX, y: e.clientY, id: e.pointerId };
  }, true);

  document.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'mouse' || !down) return;
    const start = down;
    down = null;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) { lastTap = null; return; }
    const post = e.target.closest && e.target.closest('.post[data-post]');
    if (!post) { lastTap = null; return; }
    if (e.target.closest('.post-preview, button, a, input, textarea, select, [contenteditable], .acts, .post-tags, .post-h')) {
      lastTap = null;
      return;
    }
    const now = performance.now();
    if (lastTap && lastTap.id === post.dataset.post && now - lastTap.t < 330
      && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 30) {
      lastTap = null;
      toggleLike(post.dataset.post, post.querySelector('[data-act="like"]'), {
        force: true,
        origin: { x: e.clientX, y: e.clientY }
      });
      return;
    }
    lastTap = { t: now, x: e.clientX, y: e.clientY, id: post.dataset.post };
  }, true);

  document.addEventListener('pointercancel', () => { down = null; }, true);

  document.addEventListener('dblclick', (e) => {
    const post = e.target.closest && e.target.closest('.post[data-post]');
    if (!post) return;
    if (e.target.closest('.post-preview, button, a, input, textarea, select, [contenteditable], .acts, .post-tags, .post-h, .post-text')) return;
    toggleLike(post.dataset.post, post.querySelector('[data-act="like"]'), {
      force: true,
      origin: { x: e.clientX, y: e.clientY }
    });
  });
}

let suppressClickUntil = 0;

function bindGestures() {
  let gesture = null;
  const mobile = () => matchMedia('(pointer: coarse)').matches || innerWidth < 900;
  const blocked = (target) => target && target.closest && target.closest(
    'input, textarea, select, [contenteditable], [data-carousel], .carousel, .tabbar, .scroll-indicator'
  );

  document.addEventListener('touchstart', (e) => {
    if (!mobile() || layers.length || e.touches.length !== 1) { gesture = null; return; }
    if (blocked(e.target)) { gesture = null; return; }
    const t = e.touches[0];
    gesture = { x: t.clientX, y: t.clientY };
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!gesture) return;
    const t = e.touches[0];
    const dx = t.clientX - gesture.x;
    const dy = t.clientY - gesture.y;
    if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) gesture = null;
  }, { passive: true });

  document.addEventListener('touchend', (e) => {
    if (!gesture) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - gesture.x;
    const dy = t.clientY - gesture.y;
    gesture = null;
    const horizontal = Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.4;
    if (!horizontal || layers.length) return;
    const index = TABS.indexOf(currentTab);
    const next = dx < 0 ? index + 1 : index - 1;
    if (next < 0 || next >= TABS.length) return;
    suppressClickUntil = performance.now() + 340;
    setTab(TABS[next], { keepScroll: true, direction: dx < 0 ? 'forward' : 'back' });
  }, { passive: true });

  document.addEventListener('touchcancel', () => { gesture = null; }, { passive: true });

  document.addEventListener('click', (e) => {
    if (performance.now() < suppressClickUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
}

/* ------------------------------------------------------------------ pwa + boot */

function handleQuery() {
  if (!state.auth) return;
  const params = new URLSearchParams(location.search);
  const tab = params.get('tab');
  const compose = params.has('compose');
  if (!tab && !compose) return;
  try { history.replaceState(navSnapshot(0, []), '', location.pathname); } catch (e) {}
  if (tab && ['feed', 'explore', 'chat', 'profile'].includes(tab)) {
    setTab(tab, { keepScroll: true, noHistory: true, animate: false });
  }
  if (compose) openCompose();
  queueMicrotask(rebuildNav);
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const dev = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) || location.protocol === 'file:';
  const nosw = new URLSearchParams(location.search).has('nosw');
  if (dev || nosw) {
    navigator.serviceWorker.getRegistrations()
      .then((rs) => Promise.all(rs.map((r) => r.unregister())))
      .catch(() => {});
    if ('caches' in window) {
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).catch(() => {});
    }
    return;
  }

  const start = () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  };
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });

  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload();
    else hadController = true;
  });
}

function boot() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const standaloneQuery = matchMedia('(display-mode: standalone)');
  const syncStandalone = () => {
    document.documentElement.classList.toggle('standalone', !!(standaloneQuery.matches || navigator.standalone));
  };
  syncStandalone();
  if (standaloneQuery.addEventListener) standaloneQuery.addEventListener('change', syncStandalone);
  else if (standaloneQuery.addListener) standaloneQuery.addListener(syncStandalone);
  applyTheme();
  injectIcons();
  $$('.view').forEach((v) => { v.hidden = false; });
  $$('[data-version]').forEach((el) => { el.textContent = 'V' + APP_VERSION; });
  bindEvents();
  initViewport();

  $$('.view').forEach((view) => {
    view.addEventListener('scroll', () => {
      if (view.dataset.view !== currentTab) return;
      ui.scrolls[currentTab] = view.scrollTop;
      saveUI();
    }, { passive: true });
  });

  exploreQuery = ui.explore || '';
  profileTab = ui.profileTab || 'posts';
  const savedSearch = $('#explore-search');
  if (savedSearch) savedSearch.value = exploreQuery;

  if (state.auth) {
    document.documentElement.classList.add('authed');
    $('#login').hidden = true;
    $('#shell').hidden = false;
    renderAll();
    setTab(ui.tab, { keepScroll: true, noHistory: true, animate: false });
    restoreLayers(ui.layers, { silent: true, animate: false });
    rebuildNav();
    ensureAvatarData();
  } else {
    showLogin();
    resetNav();
  }

  viewsRoot.addEventListener('scroll', scheduleScrollbar, true);
  scrollThumb.addEventListener('pointerdown', (e) => {
    if (!document.documentElement.classList.contains('custom-scroll')) return;
    const scroller = activeScroller();
    if (!scroller) return;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    if (maxScroll <= 0) return;
    e.preventDefault();
    scrollThumb.setPointerCapture(e.pointerId);
    const trackHeight = scrollIndicator.getBoundingClientRect().height;
    const thumbHeight = scrollThumb.getBoundingClientRect().height;
    const maxTop = Math.max(1, trackHeight - thumbHeight);
    scrollDrag = {
      scroller,
      startY: e.clientY,
      startScroll: scroller.scrollTop,
      ratio: maxScroll / maxTop
    };
    scrollIndicator.classList.add('dragging');
  });
  scrollIndicator.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.scroll-thumb')) return;
    const scroller = activeScroller();
    if (!scroller) return;
    const maxScroll = scroller.scrollHeight - scroller.clientHeight;
    if (maxScroll <= 0) return;
    const rect = scrollIndicator.getBoundingClientRect();
    const thumbHeight = scrollThumb.getBoundingClientRect().height;
    const maxTop = Math.max(1, rect.height - thumbHeight);
    const ratio = Math.max(0, Math.min(1, (e.clientY - rect.top - thumbHeight / 2) / maxTop));
    scroller.scrollTop = ratio * maxScroll;
    scheduleScrollbar();
  });
  scrollThumb.addEventListener('pointermove', (e) => {
    if (!scrollDrag) return;
    scrollDrag.scroller.scrollTop = scrollDrag.startScroll + (e.clientY - scrollDrag.startY) * scrollDrag.ratio;
    scheduleScrollbar();
  });
  const endScrollDrag = () => {
    scrollDrag = null;
    scrollIndicator.classList.remove('dragging');
  };
  scrollThumb.addEventListener('pointerup', endScrollDrag);
  scrollThumb.addEventListener('pointercancel', endScrollDrag);
  addEventListener('resize', () => { syncScrollMode(); scheduleScrollbar(); });
  addEventListener('load', scheduleScrollbar);
  syncScrollMode();
  scheduleScrollbar();

  handleQuery();
  updateTimes();
  setInterval(updateTimes, 60000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flushSaved();
    else updateTimes();
  });
  addEventListener('pagehide', flushSaved);
  registerSW();
}

boot();
