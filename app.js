/* ------------------------------------------------------------------ utils */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const KEY = 'koinara.v1';
const APP_VERSION = '1.2';
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
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[^\w]+/g, '').slice(0, 20);

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
  return `width:${m.bw}%;height:${m.bh}%;transform:translate(-50%,-50%) translate(${m.px}%,${m.py}%) scale(${m.z})`;
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
    const kinds = new Set(['profile', 'people', 'post', 'chat', 'settings', 'shortcuts', 'saved', 'liked', 'comments', 'compose', 'edit', 'crop', 'confirm']);
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
const messagesOf = (chatId) => state.messages[chatId] || [];

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
  return `<button class="comment-item" type="button" data-act="open" data-id="${post.id}">
    <div class="comment-top"><span>On a post by ${esc(u.name)}</span><time datetime="${new Date(reply.ts).toISOString()}" data-ts="${reply.ts}">${rel(reply.ts)}</time></div>
    <div class="comment-text">${esc(reply.text)}</div>
    <div class="comment-quote">${esc(excerpt)}</div>
  </button>`;
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
    renderProfile();
    renderFeed();
  } catch (e) {}
}

/* ------------------------------------------------------------------ images */

function imgTag(im, sizes) {
  if (im.s) {
    return `<img src="assets/img/${im.s}-400.avif" srcset="assets/img/${im.s}-400.avif 400w, assets/img/${im.s}-800.avif 800w" sizes="${sizes}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="lazy" decoding="async" data-fade style="aspect-ratio:${im.w}/${im.h}">`;
  }
  return `<img data-media="${im.m}" width="${im.w}" height="${im.h}" alt="${esc(im.a || '')}" loading="lazy" decoding="async" data-fade style="aspect-ratio:${im.w}/${im.h}">`;
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

function mediaHtml(p, detail) {
  const imgs = p.images || [];
  if (!imgs.length) return '';
  const ratio = postRatio(p);
  const sizes = '(min-width: 600px) 528px, 100vw';
  if (imgs.length === 1) {
    const frame = `<div class="photo-single" style="aspect-ratio:${ratio}">${photoImg(imgs[0], sizes, false, ratio)}</div>`;
    return `<div class="media">${frame}${mediaHeart()}</div>`;
  }
  const slides = imgs.map((im, i) => {
    const frame = `<div class="photo-frame">${photoImg(im, sizes, true, ratio)}</div>`;
    return detail
      ? `<div class="carousel-slide" role="group" aria-roledescription="slide" aria-label="Photo ${i + 1} of ${imgs.length}">${frame}</div>`
      : `<div class="carousel-slide" role="group" aria-roledescription="slide" aria-label="Photo ${i + 1} of ${imgs.length}">${frame}</div>`;
  }).join('');
  const dots = imgs.map((_, i) => `<button class="cdot${i === 0 ? ' on' : ''}" type="button" data-act="cdots" data-i="${i}" aria-label="Show photo ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('');
  return `<div class="media">
    <div class="carousel" data-carousel style="--ratio:${ratio}" role="group" aria-roledescription="carousel" aria-label="Photos">
      <div class="carousel-track" tabindex="0">${slides}</div>
      <button class="carousel-arrow prev" type="button" data-act="cslide" data-dir="-1" aria-label="Previous photo" title="Previous photo">${icon('chevron-right')}</button>
      <button class="carousel-arrow next" type="button" data-act="cslide" data-dir="1" aria-label="Next photo" title="Next photo">${icon('chevron-right')}</button>
      <div class="carousel-dots">${dots}</div>
    </div>
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
    track.style.transition = 'transform 220ms var(--ease)';
    car._animTimer = setTimeout(() => track.classList.remove('animating'), 240);
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
      setX(-drag.index * drag.width + drag.dx);
    };
    const settle = (target) => {
      track.classList.remove('dragging');
      carouselGo(car, target);
    };
    const reset = () => {
      if (!drag) return;
      cancelAnimationFrame(raf);
      raf = 0;
      track.classList.remove('dragging');
      track.style.transition = 'none';
      setX(-car._index * (drag.width || width));
      drag = null;
    };

    const start = (x, y) => {
      width = track.clientWidth || car.clientWidth;
      if (!width) return;
      cancelAnimationFrame(raf);
      raf = 0;
      track.style.transition = 'none';
      drag = {
        x, y,
        lastX: x,
        lastT: performance.now(),
        vx: 0,
        dx: 0,
        axis: null,
        width,
        index: car._index || 0
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
      if (d.axis !== 'x') { drag = null; return; }
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
      settle(target);
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
    });

    track.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerType !== 'mouse') return;
      move(e.clientX, e.clientY, performance.now());
    });

    const endMouse = (e) => {
      if (!drag || e.pointerType !== 'mouse') return;
      end(e.clientX);
    };
    track.addEventListener('pointerup', endMouse);
    track.addEventListener('pointercancel', reset);

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

function injectIcons(root = document) {
  $$('[data-icon]', root).forEach((el) => {
    el.innerHTML = icon(el.dataset.icon);
  });
}

/* ------------------------------------------------------------------ avatars */

function av(u, size = 36, cls = '') {
  if (!u) u = { id: 'x', name: '?' };
  const fallback = `<span class="av-fallback" aria-hidden="true">${initials(u.name)}</span>`;
  if (u.avatar && u.avatar.d) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img src="${esc(u.avatar.d)}" alt="" width="${size}" height="${size}" decoding="async"></span>`;
  }
  if (u.avatar && u.avatar.m) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img data-media="${u.avatar.m}" alt="" width="${size}" height="${size}"></span>`;
  }
  if (u.avatar && u.avatar.s) {
    return `<span class="av has-img ${cls}" style="--av:${size}px">${fallback}<img src="assets/img/${esc(u.avatar.s)}.avif" alt="" width="${size}" height="${size}" loading="lazy" decoding="async"></span>`;
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
  const images = mediaHtml(p, detail);

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
    </footer>
  </article>`;
}

function replyHtml(r) {
  const u = user(r.userId);
  return `<div class="reply" data-reply="${r.id}">
    ${av(u, 28)}
    <div class="reply-main">
      <div class="reply-head"><span class="reply-name">${esc(u.name)}</span><span class="reply-time"><time datetime="${new Date(r.ts).toISOString()}" data-ts="${r.ts}">${rel(r.ts)}</time></span></div>
      <div class="reply-text">${esc(r.text)}</div>
    </div>
  </div>`;
}

function repliesHtml(postId) {
  return repliesOf(postId).slice().sort((a, b) => a.ts - b.ts).map(replyHtml).join('');
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
      ${av(u, 76)}
      <div class="profile-idtext">
        <h2 class="p-name">${esc(u.name)}</h2>
        <div class="p-handle">@${esc(u.handle)}</div>
      </div>
      ${isMe
        ? `<div class="profile-actions">
            <button class="btn ghost sm profile-edit" type="button" data-act="edit" aria-label="Edit profile"><span data-icon="pen"></span>Edit</button>
            <button class="btn ghost sm profile-settings" type="button" data-act="settings" aria-label="Settings" title="Settings">${icon('settings')}</button>
          </div>`
        : `<button class="btn sm follow-btn${follows ? ' ghost' : ''}" type="button" data-act="follow" data-id="${u.id}" data-follow-btn="${u.id}" aria-pressed="${follows}" aria-label="${follows ? 'Unfollow' : 'Follow'} ${esc(u.name)}">${follows ? `${icon('check')}Following` : 'Follow'}</button>`}
    </div>
    <p class="p-bio">${esc(u.bio)}</p>
    <div class="p-joined">Joined ${esc(u.joined)}</div>
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
  const words = tokens.filter((t) => !t.startsWith('#')).map((t) => t.toLowerCase());
  return { tags, words };
}

function renderExplore() {
  const body = $('#explore-body');
  const q = exploreQuery.trim().toLowerCase();
  const posts = sortedPosts();

  if (!q) {
    const counts = new Map();
    for (const p of posts) for (const t of (p.tags || [])) counts.set(t, (counts.get(t) || 0) + 1);
    const tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12);
    const photos = [];
    const seenPhotos = new Set();
    const photoPosts = posts
      .filter((p) => p.images && p.images.length)
      .sort((a, b) => (b.images.length - a.images.length) || (b.ts - a.ts));
    for (const p of photoPosts) {
      if (photos.length >= 12) break;
      const im = p.images.find((image) => !seenPhotos.has(image.s || image.m));
      if (!im) continue;
      seenPhotos.add(im.s || im.m);
      photos.push({ p, im });
    }

    body.innerHTML = `
      <div class="section"><h3 class="section-h">Trending</h3></div>
      <div class="tags">${tags.map(([t, n]) => `<button class="tag" type="button" data-act="tag" data-q="#${esc(t)}">#${esc(t)}<span class="tag-n">${n}</span></button>`).join('')}</div>
      <div class="section"><h3 class="section-h">People</h3></div>
      <div>${state.users.map(personRow).join('')}</div>
      <div class="section"><h3 class="section-h">Photos</h3></div>
      ${photos.length ? photoGrid(photos, true) : '<p class="empty">No photos yet.</p>'}
    `;
    hydrate(body);
    return;
  }

  const { tags: qTags, words } = parseSearch(q);
  const people = qTags.length ? [] : state.users.filter((u) => {
    const hay = `${u.name} ${u.handle} ${u.bio}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const found = posts.filter((p) => {
    const tags = (p.tags || []).map((t) => t.toLowerCase());
    if (qTags.some((t) => !tags.some((tag) => tag.startsWith(t)))) return false;
    if (!words.length) return true;
    const u = user(p.userId);
    const hay = `${p.text || ''} ${u.name} ${u.handle} ${tags.join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  }).slice(0, 30);

  const heading = qTags.length
    ? `Tagged ${qTags.map((t) => '#' + esc(t)).join(' ')}`
    : 'Posts';

  body.innerHTML = `
    ${people.length ? `<div class="section"><h3 class="section-h">People</h3></div><div>${people.map(personRow).join('')}</div>` : ''}
    <div class="section"><h3 class="section-h">${heading}</h3></div>
    ${found.length ? found.map((p) => postCard(p)).join('') : `<p class="empty">${qTags.length ? `No posts tagged #${esc(qTags[0])} yet.` : 'No posts found.'}</p>`}
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
        <div class="chat-last">${n ? '<span class="unread-dot"></span>' : ''}<span class="preview">${esc(preview)}</span></div>
      </div>
    </button>`;
  }).join('') || '<p class="empty">No conversations yet.</p>';

  updateTabUnread();
  scheduleScrollbar();
}

function renderProfile() {
  const me = state.me;
  const posts = sortedPosts().filter((p) => p.userId === 'me');
  const saved = sortedPosts().filter((p) => state.bookmarked.includes(p.id));
  const photos = [];
  for (const p of posts) for (const im of (p.images || [])) photos.push({ p, im });

  const list = profileTab === 'media'
    ? (photos.length ? photoGrid(photos) : '<p class="empty">No photos yet.</p>')
    : profileTab === 'saved'
      ? (saved.length ? saved.map((p) => postCard(p)).join('') : '<p class="empty">Nothing saved yet. Tap the bookmark on a post to keep it here.</p>')
      : (posts.length ? posts.map((p) => postCard(p)).join('') : '<p class="empty">No posts yet.</p>');

  const body = $('#profile-body');
  body.innerHTML = `
    ${profileHead(me, posts.length, true)}
    <div class="seg three">
      <button class="${profileTab === 'posts' ? 'on' : ''}" type="button" data-act="ptab" data-v="posts">Posts</button>
      <button class="${profileTab === 'media' ? 'on' : ''}" type="button" data-act="ptab" data-v="media">Media</button>
      <button class="${profileTab === 'saved' ? 'on' : ''}" type="button" data-act="ptab" data-v="saved" aria-label="Saved posts, only visible to you" title="Only visible to you">${icon('lock')}<span>Saved</span></button>
    </div>
    ${list}
  `;
  injectIcons(body);
  hydrate(body);
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

let viewportRaf = 0;
let typingTimer = 0;
let viewportApplied = null;

function syncViewport() {
  if (viewportRaf) return;
  viewportRaf = requestAnimationFrame(() => {
    viewportRaf = 0;
    const vv = window.visualViewport;
    const root = document.documentElement;
    const layout = Math.max(root.clientHeight || 0, window.innerHeight || 0);
    let height = vv && vv.height ? vv.height : window.innerHeight;
    let top = vv && Number.isFinite(vv.offsetTop) ? vv.offsetTop : 0;
    if (!height || height < 160) height = window.innerHeight;
    if (!Number.isFinite(top) || Math.abs(top) < .5) top = 0;
    const kb = Math.max(0, Math.round(layout - (height + top)));
    const focused = isTextInput(document.activeElement);
    root.classList.toggle('typing', focused);
    // Only pin the shell when the keyboard actually overlays the layout
    // viewport. Otherwise let 100dvh follow the browser chrome natively.
    const open = focused && kb > 90;
    const key = `${open ? 1 : 0}:${open ? Math.round(height) : 0}:${open ? Math.round(top) : 0}`;
    if (key !== viewportApplied) {
      viewportApplied = key;
      if (open) {
        root.style.setProperty('--app-h', Math.round(height) + 'px');
        root.style.setProperty('--app-top', Math.round(top) + 'px');
      } else {
        root.style.removeProperty('--app-h');
        root.style.removeProperty('--app-top');
      }
      root.style.setProperty('--kb', kb + 'px');
      root.classList.toggle('kb-open', open);
      scheduleScrollbar();
    }
    if (open) scheduleScrollbar();
  });
}

function revealFocused(el) {
  if (!el || !el.isConnected) return;
  const scroller = el.closest('.layer-body, .msgs, .view');
  if (!scroller) return;
  const er = el.getBoundingClientRect();
  const sr = scroller.getBoundingClientRect();
  if (er.bottom > sr.bottom - 14) scroller.scrollTop += er.bottom - sr.bottom + 18;
  else if (er.top < sr.top + 14) scroller.scrollTop -= sr.top - er.top + 18;
}

function initViewport() {
  const vv = window.visualViewport;
  if (vv) {
    vv.addEventListener('resize', syncViewport, { passive: true });
    vv.addEventListener('scroll', syncViewport, { passive: true });
  }
  addEventListener('resize', syncViewport, { passive: true });
  addEventListener('orientationchange', () => setTimeout(syncViewport, 80));
  const onFocus = (e) => {
    if (!isTextInput(e.target)) return;
    document.documentElement.classList.add('typing');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      syncViewport();
      revealFocused(e.target);
    }, 260);
    setTimeout(() => revealFocused(e.target), 60);
  };
  const onBlur = () => {
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      if (!isTextInput(document.activeElement)) document.documentElement.classList.remove('typing');
      syncViewport();
    }, 120);
  };
  document.addEventListener('focusin', onFocus);
  document.addEventListener('focusout', onBlur);
  document.addEventListener('focus', onFocus, true);
  document.addEventListener('blur', onBlur, true);
  // Some embedded/mobile browsers do not emit focus events for scripted or
  // tapped inputs. Re-check after the tap has settled as a safety net.
  document.addEventListener('pointerup', () => {
    setTimeout(() => {
      const el = document.activeElement;
      if (isTextInput(el)) onFocus({ target: el });
      else onBlur();
    }, 50);
  }, true);
  syncViewport();
}

function bindKeyboard() {
  // The app shell is sized from visualViewport globally, so layers only need
  // to keep their own scroll position. Focus reveal is handled in initViewport.
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
  const kb = bindKeyboard(el);
  entry.cleanup = () => {
    if (opts.onClose) opts.onClose();
    kb();
  };

  entry.scrollEl = el.querySelector('.layer-body, .msgs');
  if (entry.scrollEl) {
    entry.scrollEl.addEventListener('scroll', () => {
      if (!restoringLayers) saveUI();
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
  if (entry.cleanup) {
    entry.cleanup();
    entry.cleanup = null;
  }
  if (immediate) entry.el.remove();
  else setTimeout(() => entry.el.remove(), matchMedia('(min-width: 900px)').matches ? 360 : 310);
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

function saveBurst(id, btn) {
  const card = btn ? btn.closest('.post') : document.querySelector(`[data-post="${id}"]`);
  if (!card) return;
  const mark = btn || card.querySelector('[data-act="bookmark"]');
  const icon = mark && mark.querySelector('.i');
  const rect = (icon || mark || card).getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'like-ripple save-ripple';
  ripple.setAttribute('aria-hidden', 'true');
  ripple.style.left = (rect.left + rect.width / 2) + 'px';
  ripple.style.top = (rect.top + rect.height / 2) + 'px';
  document.body.append(ripple);
  setTimeout(() => ripple.remove(), 800);
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
        <input class="field search" type="search" placeholder="Search people" autocomplete="off" autocapitalize="none" spellcheck="false" aria-label="Search people">
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

function openPost(id) {
  const p = postById(id);
  if (!p) return;

  const entry = mountLayer(`
    ${layerHead('Post')}
    <div class="layer-body" id="detail-body">
      ${postCard(p, { detail: true })}
      <div class="replies" id="detail-replies">${repliesHtml(id)}</div>
    </div>
    <form class="replybar" id="reply-form">
      <input class="field" name="reply" type="text" maxlength="300" placeholder="Write a reply" autocomplete="off" enterkeyhint="send" aria-label="Write a reply">
      <button class="btn sm" type="submit">Reply</button>
    </form>
  `, { cls: 'detail-layer', descriptor: { type: 'post', id } });

  const form = $('#reply-form', entry.el);
  entry.capture = () => {
    const value = form.querySelector('input').value;
    return value.trim() ? { draft: value.slice(0, 300) } : {};
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    const text = input.value.trim();
    if (!text) return;
    const reply = { id: uid('r'), userId: 'me', ts: Date.now(), text };
    if (!state.replies[id]) state.replies[id] = [];
    state.replies[id].push(reply);
    save();
    $('#detail-replies', entry.el).insertAdjacentHTML('beforeend', replyHtml(reply));
    input.value = '';
    updatePostUI(id);
    refreshCollectionLayers('comments');
    const body = $('#detail-body', entry.el);
    body.scrollTop = body.scrollHeight;
  });
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
      <input class="field" name="message" type="text" maxlength="500" placeholder="Message" autocomplete="off" enterkeyhint="send" aria-label="Message ${esc(u.name)}">
      <button class="send" type="submit" aria-label="Send">${icon('send')}</button>
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

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) return null;
  const id = uid('m');
  try { await idbPut(id, blob); } catch (e) { return null; }
  state.uploaded[id] = { w: cw, h: ch };
  save();
  return { m: id, w: cw, h: ch };
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

/* ------------------------------------------------------------------ compose */

let activeCompose = null;
let activeCrop = null;

function openCompose(restore) {
  if (activeCompose && activeCompose.entry.el.isConnected) return activeCompose;

  const source = restore && restore.draft ? restore.draft : (ui.composeDraft || null);
  const draft = sanitizeDraft(source) || { text: '', tags: [], ratio: 'auto', attachments: [] };
  const attachments = draft.attachments
    .filter((a) => a && state.uploaded[a.m])
    .map((a) => ({ ...a, crop: normalizeCrop(a.crop) }));
  let tags = draft.tags.slice();
  let ratio = draft.ratio;
  let busy = 0;
  let closed = false;
  let published = false;
  let discarded = false;
  let draftTimer = 0;

  const entry = mountLayer(`
    <header class="layer-h">
      <button class="icon-btn" type="button" data-act="close" aria-label="Close">${icon('x')}</button>
      <h2>New post</h2>
      <div class="layer-a"><button class="btn sm" id="publish" type="button" disabled>Post</button></div>
    </header>
    <div class="layer-body compose-body">
      <section class="compose-section">
        <div class="compose-label">Text</div>
        <textarea class="compose-area" id="compose-text" maxlength="500" placeholder="What's on your mind?" aria-label="Post text"></textarea>
      </section>

      <section class="compose-section">
        <div class="compose-label-row">
          <span class="compose-label">Photos</span>
          <span class="compose-label-tools">
            <button class="ratio-chip" id="compose-ratio-btn" type="button" title="Change aspect ratio">Auto</button>
            <span class="compose-note" id="photo-count">0/5</span>
          </span>
        </div>
        <div class="photo-strip" id="compose-photos"></div>
        <input id="compose-file" type="file" accept="image/*" multiple hidden>
        <p class="compose-hint" id="photo-hint">Add up to five photos. Tap one to crop, zoom and reposition it.</p>
      </section>

      <section class="compose-section">
        <div class="compose-label-row"><span class="compose-label">Tags</span><span class="compose-note">Up to 3</span></div>
        <div class="tagedit">
          <div class="tagchips" id="compose-tags"></div>
          <input class="taginput" id="compose-tag" type="text" maxlength="24" placeholder="Add up to 3 tags" autocomplete="off" spellcheck="false" aria-label="Add a tag">
        </div>
      </section>

      <section class="compose-section preview-section">
        <div class="compose-label">Preview</div>
        <div class="post-preview">
          <header class="post-h">
            ${av(state.me, 36)}
            <div class="post-meta">
              <span class="pname">${esc(state.me.name)}</span>
              <div class="phandle">@${esc(state.me.handle)} · now</div>
            </div>
          </header>
          <p class="preview-empty" id="preview-empty">Your post will appear here.</p>
          <div class="preview-text" id="preview-text" hidden></div>
          <div id="preview-media"></div>
          <div class="post-tags" id="preview-tags" hidden></div>
        </div>
      </section>
    </div>
    <footer class="compose-foot">
      <button class="textbtn compose-discard" id="compose-discard" type="button">Discard</button>
      <span class="spacer"></span>
      <button class="icon-btn" id="compose-pick" type="button" aria-label="Add photos" title="Add photos">${icon('image')}</button>
      <span class="count" id="compose-count">0/500</span>
    </footer>
  `, {
    up: true,
    cls: 'compose-layer',
    descriptor: { type: 'compose' },
    capture() {
      const d = buildDraft();
      return { draft: d };
    },
    onClose() {
      closed = true;
      clearTimeout(draftTimer);
      draftTimer = 0;
      if (published || discarded) {
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
  const photoHint = $('#photo-hint', el);
  const ratioBtn = $('#compose-ratio-btn', el);
  const pick = $('#compose-pick', el);
  const file = $('#compose-file', el);
  const tagBox = $('#compose-tags', el);
  const tagInput = $('#compose-tag', el);
  const previewText = $('#preview-text', el);
  const previewMedia = $('#preview-media', el);
  const previewTags = $('#preview-tags', el);
  const previewEmpty = $('#preview-empty', el);
  const discard = $('#compose-discard', el);

  const cleanTag = (raw) => String(raw || '').trim().replace(/^#+/, '').toLowerCase()
    .replace(/[^\p{L}\p{N}_-]+/gu, '').slice(0, 24);

  function buildDraft() {
    const text = area ? area.value.slice(0, 500) : '';
    if (!text.trim() && !tags.length && !attachments.length) return null;
    return {
      text,
      tags: tags.slice(),
      ratio,
      attachments: attachments.map((a) => ({ m: a.m, w: a.w, h: a.h, crop: { ...a.crop } }))
    };
  }

  function saveDraftNow() {
    clearTimeout(draftTimer);
    draftTimer = 0;
    ui.composeDraft = buildDraft();
    saveUI();
  }

  function saveDraft() {
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraftNow, 180);
  }

  function previewPost() {
    return {
      id: 'preview',
      userId: 'me',
      ts: Date.now(),
      text: area.value.trim(),
      tags: tags.slice(),
      images: attachments.map((a) => ({ m: a.m, w: a.w, h: a.h, crop: { ...a.crop } })),
      ratio
    };
  }

  function syncPreviewMeta() {
    const text = area.value.trim();
    previewText.textContent = text;
    previewText.hidden = !text;
    previewTags.innerHTML = tags.map((t) => `<span class="ptag">#${esc(t)}</span>`).join('');
    previewTags.hidden = !tags.length;
    previewEmpty.hidden = !!(text || attachments.length);
  }

  function syncPreviewMedia() {
    if (!attachments.length) {
      previewMedia.innerHTML = '';
      return;
    }
    previewMedia.innerHTML = mediaHtml(previewPost(), true);
    hydrate(previewMedia);
  }

  function sync() {
    photoCount.textContent = attachments.length + '/5';
    photoHint.hidden = attachments.length > 0;
    ratioBtn.textContent = ratioLabel(ratio);
    ratioBtn.disabled = !attachments.length;
    count.textContent = busy ? 'Optimising...' : area.value.length + '/500';
    publish.disabled = busy > 0 || (!area.value.trim() && attachments.length === 0);
    discard.disabled = !area.value.trim() && !attachments.length && !tags.length;
    syncPreviewMeta();
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
        <img data-media="${a.m}" alt="" draggable="false" style="${cropStyle(a, '1 / 1')}">
      </button>
      <span class="photo-index">${i + 1}</span>
      <button class="photo-remove" type="button" data-rm="${a.m}" aria-label="Remove photo ${i + 1}">${icon('x')}</button>
    </div>`;
  }

  function renderPhotos() {
    const add = attachments.length < 5
      ? `<button class="photo-tile photo-add-tile" id="photo-add" type="button" aria-label="Add photos">${icon('plus')}<span>Add</span></button>`
      : '';
    photosEl.innerHTML = attachments.map(thumbHtml).join('') + add;
    hydrate(photosEl);
    syncPreviewMedia();
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
    syncPreviewMeta();
    sync();
  }

  function removeAt(index) {
    const a = attachments[index];
    if (!a) return;
    attachments.splice(index, 1);
    discardMedia(a.m);
    refresh();
  }

  function discardNow() {
    discarded = true;
    for (const a of attachments) discardMedia(a.m);
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
      const i = attachments.findIndex((a) => a.m === rm.dataset.rm);
      if (i >= 0) removeAt(i);
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) { openEditor(Number(edit.dataset.edit) || 0); return; }
    if (e.target.closest('#photo-add')) file.click();
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
  pick.addEventListener('click', () => file.click());
  discard.addEventListener('click', () => {
    if (discard.disabled) return;
    openConfirm('discard');
  });

  file.addEventListener('change', async () => {
    const all = Array.from(file.files || []);
    file.value = '';
    const room = 5 - attachments.length;
    if (all.length > room) toast('Up to five photos.');
    const files = all.slice(0, room);
    if (!files.length) return;
    busy += files.length;
    sync();
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
      sync();
    }
  });

  publish.addEventListener('click', () => {
    if (publish.disabled) return;
    const post = {
      id: uid('p'),
      userId: 'me',
      ts: Date.now(),
      likes: 0,
      text: area.value.trim(),
      tags: tags.slice(),
      ratio,
      images: attachments.map((a) => ({ m: a.m, w: a.w, h: a.h, a: '', crop: { ...a.crop } }))
    };
    state.posts.push(post);
    published = true;
    ui.composeDraft = null;
    save();
    saveUI();
    renderFeed(post.id);
    setTab('feed', { top: true });
    renderProfile();
    renderExplore();
    toast('Posted');
  });

  area.value = draft.text || '';
  renderTags();
  grow();
  renderPhotos();
  if (!restore) {
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
      <div class="layer-a"><button class="btn sm" id="crop-done" type="button">Done</button></div>
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
        <div class="crop-tools-row">
          <button class="crop-reset" id="crop-reset" type="button">Reset</button>
          <label class="crop-zoom-label">Zoom
            <input class="crop-zoom" id="crop-zoom" type="range" min="1" max="4" step=".01" value="1" aria-label="Zoom photo">
          </label>
          <button class="crop-remove" id="crop-remove" type="button">Remove</button>
        </div>
      </div>
    </div>
  `, {
    up: true,
    cls: 'crop-layer',
    descriptor: { type: 'crop' },
    capture() { return { index: current }; },
    onClose() {
      if (cleanupResize) cleanupResize();
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
  const zoom = $('#crop-zoom', el);
  const ratioSeg = $('#crop-ratio', el);

  const frameRatio = () => ratioFor(comp.ratio, list);
  const photo = () => list[current];
  const stageImg = () => stage.querySelector('img');

  function layout() {
    const a = photo();
    if (!a) return;
    const R = ratioValue(frameRatio());
    const availW = Math.max(80, wrap.clientWidth - 24);
    const availH = Math.max(80, wrap.clientHeight - 16);
    let w = Math.min(availW, availH * R);
    let h = w / R;
    if (h > availH) { h = availH; w = h * R; }
    stage.style.width = Math.round(w) + 'px';
    stage.style.height = Math.round(h) + 'px';
    stage.innerHTML = `<img data-media="${a.m}" alt="" draggable="false" style="${cropStyle(a, frameRatio())}">`;
    hydrate(stage);
    zoom.value = String(a.crop.z);
    stageRect = stage.getBoundingClientRect();
  }

  function updateImage() {
    const a = photo();
    const img = stageImg();
    if (!a || !img) return;
    const m = cropMetrics(a, frameRatio());
    img.style.transform = `translate(-50%,-50%) translate(${m.px}%,${m.py}%) scale(${m.z})`;
    zoom.value = String(a.crop.z);
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
    film.innerHTML = list.map((a, i) => `<button class="film-thumb${i === current ? ' on' : ''}" type="button" data-film="${i}" aria-label="Photo ${i + 1}">
      <img data-media="${a.m}" alt="" draggable="false" style="${cropStyle(a, '1 / 1')}">
    </button>`).join('');
    hydrate(film);
  }

  const pointers = new Map();
  let pan = null;
  let pinch = null;

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
      zoomTo(pinch.z * dist / pinch.dist, mid.x, mid.y);
    } else if (pan && pointers.size === 1) {
      panBy(e.clientX - pan.x, e.clientY - pan.y);
      pan = { x: e.clientX, y: e.clientY };
    }
  });

  function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
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
    const a = photo();
    if (!a) return;
    const factor = Math.exp(-e.deltaY * .0016);
    zoomTo(a.crop.z * factor, e.clientX, e.clientY);
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
    const a = photo();
    if (!a) return;
    const rect = stage.getBoundingClientRect();
    zoomTo(Number(zoom.value) || 1, rect.left + rect.width / 2, rect.top + rect.height / 2);
  });

  $('#crop-reset', el).addEventListener('click', resetCrop);
  $('#crop-done', el).addEventListener('click', () => history.back());
  $('#crop-remove', el).addEventListener('click', () => {
    const at = current;
    comp.removeAt(at);
    if (!comp.attachments.length) { history.back(); return; }
    select(Math.min(at, comp.attachments.length - 1));
  });

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

/* ------------------------------------------------------------------ edit profile */

function openEdit(restore) {
  const me = state.me;
  const draft = restore && restore.draft && typeof restore.draft === 'object' ? restore.draft : null;
  const name = draft && typeof draft.name === 'string' ? draft.name.slice(0, 40) : me.name;
  const handle = draft && typeof draft.handle === 'string' ? draft.handle.slice(0, 20) : me.handle;
  const bio = draft && typeof draft.bio === 'string' ? draft.bio.slice(0, 160) : me.bio;
  let closed = false;
  const entry = mountLayer(`
    ${layerHead('Edit profile', '<button class="btn sm" id="save-profile" type="button">Save</button>')}
    <form class="layer-body edit" id="edit-form">
      <div class="avatar-edit">
        <div id="edit-av">${av(me, 64)}</div>
        <div class="avatar-actions">
          <label class="btn ghost sm">Change photo<input id="edit-avatar-file" type="file" accept="image/*" hidden></label>
          ${me.avatar ? '<button class="textbtn" id="remove-avatar" type="button" data-act="avatar-remove">Remove photo</button>' : ''}
        </div>
      </div>
      <div>
        <label class="lbl" for="edit-name">Name</label>
        <input class="field" id="edit-name" maxlength="40" value="${esc(name)}" autocomplete="name">
      </div>
      <div>
        <label class="lbl" for="edit-handle">Handle</label>
        <input class="field" id="edit-handle" maxlength="20" value="${esc(handle)}" autocapitalize="none" spellcheck="false">
      </div>
      <div>
        <label class="lbl" for="edit-bio">Bio</label>
        <textarea class="field bio" id="edit-bio" maxlength="160">${esc(bio)}</textarea>
      </div>
    </form>
  `, {
    cls: 'edit-layer',
    descriptor: { type: 'edit' },
    capture() {
      return {
        draft: {
          name: $('#edit-name', entry.el) ? $('#edit-name', entry.el).value.slice(0, 40) : name,
          handle: $('#edit-handle', entry.el) ? $('#edit-handle', entry.el).value.slice(0, 20) : handle,
          bio: $('#edit-bio', entry.el) ? $('#edit-bio', entry.el).value.slice(0, 160) : bio
        }
      };
    },
    onClose() { closed = true; }
  });

  const el = entry.el;
  const form = $('#edit-form', el);

  $('#save-profile', el).addEventListener('click', () => form.requestSubmit());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    me.name = ($('#edit-name', el).value.trim() || me.name).slice(0, 40);
    me.handle = slug($('#edit-handle', el).value) || me.handle;
    me.bio = $('#edit-bio', el).value.trim().slice(0, 160);
    save();
    renderFeed();
    renderExplore();
    renderProfile();
    history.back();
    toast('Profile updated');
  });

  $('#edit-avatar-file', el).addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    toast('Optimising photo...');
    const im = await compressImage(file, 512, .86);
    if (!im) { toast("That photo didn't load."); return; }
    if (closed) { discardMedia(im.m); return; }
    let data = '';
    try {
      const blob = await idbGet(im.m);
      if (blob) data = await blobToDataURL(blob);
    } catch (e) {}
    if (closed) { discardMedia(im.m); return; }
    if (me.avatar && me.avatar.m) discardMedia(me.avatar.m);
    me.avatar = { m: im.m, w: im.w, h: im.h, d: data || undefined };
    save();
    const box = $('#edit-av', el);
    if (box) { box.innerHTML = av(me, 64); hydrate(box); }
    renderFeed();
    renderProfile();
    toast('Photo updated');
  });
}

function removeAvatar() {
  const me = state.me;
  if (!me.avatar) return;
  if (me.avatar.m) discardMedia(me.avatar.m);
  me.avatar = null;
  save();
  const box = $('#edit-av');
  if (box) { box.innerHTML = av(me, 64); hydrate(box); }
  const btn = $('#remove-avatar');
  if (btn) btn.remove();
  renderFeed();
  renderProfile();
  toast('Photo removed');
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
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#0b0b0a' : '#f4f4f1';
}

const viewEl = (name) => $('#view-' + name);

const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function swapIn(el) {
  if (!el || reducedMotion()) return;
  el.classList.remove('swap-in');
  void el.offsetWidth;
  el.classList.add('swap-in');
  setTimeout(() => el.classList.remove('swap-in'), 210);
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

  $('#feed-top').addEventListener('click', () => setTab('feed'));

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

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    const id = el.dataset.id;

    switch (act) {
      case 'compose': openCompose(); break;
      case 'settings': openSettings(); break;
      case 'shortcuts': openShortcuts(); break;
      case 'close': if (layers.length) history.back(); break;
      case 'open': openPost(id); break;
      case 'like': toggleLike(id, el); break;
      case 'bookmark': toggleBookmark(id, el); break;
      case 'share': sharePost(id); break;
      case 'profile': openProfileById(id); break;
      case 'chat': openChat(id); break;
      case 'edit': openEdit(); break;
      case 'ptab':
        profileTab = el.dataset.v;
        ui.profileTab = profileTab;
        saveUI();
        renderProfile();
        swapIn($('#profile-body'));
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
        const input = el.closest('.layer') && el.closest('.layer').querySelector('#reply-form .field');
        if (input) input.focus();
        break;
      }
      case 'tag':
        setExploreQuery(el.dataset.q || '');
        setTab('explore', { keepScroll: true });
        break;
      case 'people': openPeopleList(id, el.dataset.kind); break;
      case 'follow': toggleFollow(id); break;
      case 'saved': openSavedPosts(); break;
      case 'liked': openLikedPosts(); break;
      case 'comments': openMyComments(); break;
      case 'goto-explore': setTab('explore'); break;
      case 'cslide': {
        const car = el.closest('[data-carousel]');
        if (car) carouselGo(car, (car._index || 0) + (Number(el.dataset.dir) || 1));
        break;
      }
      case 'cdots': {
        const car = el.closest('[data-carousel]');
        if (car) carouselGo(car, Number(el.dataset.i || 0));
        break;
      }
      case 'avatar-remove': removeAvatar(); break;
    }
  });

  addEventListener('popstate', (e) => {
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
    if (e.target.closest('button, a, input, textarea, select, [contenteditable], .acts, .post-tags, .post-h')) {
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
    if (e.target.closest('button, a, input, textarea, select, [contenteditable], .acts, .post-tags, .post-h, .post-text')) return;
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
