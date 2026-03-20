// services/paletteStorage.js — mdothree-color
// Save, load, and delete user palettes from Firestore.

import {
  getDB, ensureAnonymousUser, getFirebaseAuth,
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp, deleteDoc, doc, setDoc,
} from '../config/config.js';

const PALETTES_COL = 'color_palettes';
const RECENTS_COL  = 'color_recents';

let _memPalettes = [];
let _memRecents  = [];

// ---- Saved Palettes ----

/**
 * Save a named palette to Firestore.
 * @param {{ name: string, colors: string[], scheme: string }} palette
 * @returns {Promise<string|null>} doc ID
 */
export async function savePalette(palette) {
  const user = await ensureAnonymousUser();
  if (!user) {
    const id = Date.now().toString();
    _memPalettes.unshift({ id, ...palette, createdAt: new Date() });
    return id;
  }
  try {
    const ref = await addDoc(collection(getDB(), PALETTES_COL), {
      uid:       user.uid,
      name:      palette.name || 'Untitled Palette',
      colors:    palette.colors,
      scheme:    palette.scheme || 'custom',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (e) {
    console.warn('[paletteStorage] save failed:', e.message);
    return null;
  }
}

/**
 * Load all saved palettes for the current user.
 * @returns {Promise<Array>}
 */
export async function loadPalettes() {
  const user = getFirebaseAuth().currentUser;
  if (!user) return _memPalettes;
  try {
    const q    = query(
      collection(getDB(), PALETTES_COL),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(50),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({
      id:        d.id,
      name:      d.data().name,
      colors:    d.data().colors,
      scheme:    d.data().scheme,
      createdAt: d.data().createdAt?.toDate?.() ?? new Date(),
    }));
  } catch (e) {
    console.warn('[paletteStorage] load failed:', e.message);
    return _memPalettes;
  }
}

/**
 * Delete a palette by ID.
 */
export async function deletePalette(docId) {
  const user = getFirebaseAuth().currentUser;
  if (!user) { _memPalettes = _memPalettes.filter(p => p.id !== docId); return; }
  try { await deleteDoc(doc(getDB(), PALETTES_COL, docId)); }
  catch (e) { console.warn('[paletteStorage] delete failed:', e.message); }
}

// ---- Recent Colors ----

/**
 * Sync the recent colors array to Firestore (upsert a single doc per user).
 * @param {string[]} colors — array of hex strings, max 20
 */
export async function syncRecentColors(colors) {
  const user = await ensureAnonymousUser();
  if (!user) { _memRecents = colors; return; }
  try {
    const docRef = doc(getDB(), RECENTS_COL, user.uid);
    await setDoc(docRef, { uid: user.uid, colors: colors.slice(0, 20), updatedAt: serverTimestamp() });
  } catch (e) {
    console.warn('[paletteStorage] syncRecents failed:', e.message);
  }
}

/**
 * Load recent colors for the current user.
 * @returns {Promise<string[]>}
 */
export async function loadRecentColors() {
  const user = getFirebaseAuth().currentUser;
  if (!user) return _memRecents;
  try {
    const { getDocs: _gd, doc: _d, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const docRef  = doc(getDB(), RECENTS_COL, user.uid);
    const snap    = await getDoc(docRef);
    return snap.exists() ? (snap.data().colors ?? []) : [];
  } catch (e) {
    console.warn('[paletteStorage] loadRecents failed:', e.message);
    return _memRecents;
  }
}
