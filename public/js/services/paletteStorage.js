// services/paletteStorage.js — mdothree-color
// Saved palettes and recent colors, stored ONLY in this browser
// (localStorage, with an in-memory fallback). Nothing here is sent to
// Firestore or any server: the privacy policy says tool input (including
// colors) is processed locally and not stored by us. The exported API is
// unchanged.

const PALETTES_KEY = 'mdothree-color:palettes';
const RECENTS_KEY  = 'recentColors'; // same key app.js already uses
const MAX_PALETTES = 50;
const MAX_RECENTS  = 20;

const _mem = { [PALETTES_KEY]: [], [RECENTS_KEY]: [] };

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr;
    }
  } catch { /* storage blocked or corrupt: fall back to memory */ }
  return _mem[key].slice();
}

function write(key, arr) {
  _mem[key] = arr.slice();
  try { localStorage.setItem(key, JSON.stringify(arr)); } catch { /* memory only */ }
}

// ---- Saved Palettes ----

/**
 * Save a named palette locally.
 * @param {{ name: string, colors: string[], scheme: string }} palette
 * @returns {Promise<string>} id
 */
export async function savePalette(palette) {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const list = read(PALETTES_KEY);
  list.unshift({
    id,
    name:      palette.name || 'Untitled Palette',
    colors:    Array.isArray(palette.colors) ? palette.colors.slice(0, 20) : [],
    scheme:    palette.scheme || 'custom',
    createdAt: Date.now(),
  });
  write(PALETTES_KEY, list.slice(0, MAX_PALETTES));
  return id;
}

/**
 * Load all saved palettes.
 * @returns {Promise<Array>}
 */
export async function loadPalettes() {
  return read(PALETTES_KEY).map(p => ({
    ...p,
    colors:    Array.isArray(p.colors) ? p.colors : [],
    createdAt: new Date(p.createdAt || Date.now()),
  }));
}

/**
 * Delete a palette by ID.
 */
export async function deletePalette(id) {
  write(PALETTES_KEY, read(PALETTES_KEY).filter(p => p.id !== id));
}

// ---- Recent Colors ----

/**
 * Persist the recent colors array locally (name kept for API compatibility;
 * nothing is synced to a server).
 * @param {string[]} colors — array of hex strings, max 20
 */
export async function syncRecentColors(colors) {
  write(RECENTS_KEY, (Array.isArray(colors) ? colors : []).slice(0, MAX_RECENTS));
}

/**
 * Load recent colors.
 * @returns {Promise<string[]>}
 */
export async function loadRecentColors() {
  return read(RECENTS_KEY);
}
