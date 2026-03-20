// js/app.js — mdothree-color (Firebase-integrated)

import { hexToRgb, rgbToHsl, rgbToCmyk, getColorName } from './services/colorConverter.js';
import { syncRecentColors, loadRecentColors }           from './services/paletteStorage.js';
import { showToast, copyToClipboard }                   from './utils/colorUtils.js';
import { onAuthChange, ensureAnonymousUser }             from './config/config.js';

// ---- Auth badge ----
const authBadge = Object.assign(document.createElement('div'), {
  style: 'position:fixed;bottom:16px;right:16px;font-size:0.72rem;color:var(--text-secondary);font-family:var(--font-mono);z-index:999',
});
document.body.appendChild(authBadge);
onAuthChange(u => { authBadge.textContent = u ? '🔥 syncing' : '☁ offline'; });

// ---- Elements ----
const picker    = document.getElementById('colorPicker');
const preview   = document.getElementById('colorPreview');
const recentEl  = document.getElementById('recentColors');

// ---- Recent colors (Firebase-backed) ----
let recent = [];

async function initRecents() {
  await ensureAnonymousUser();
  // Try Firebase first, fall back to localStorage
  try {
    const fbRecents = await loadRecentColors();
    try {
      const stored = localStorage.getItem('recentColors');
      const parsed = stored ? JSON.parse(stored) : [];
      recent = fbRecents.length ? fbRecents : (Array.isArray(parsed) ? parsed : []);
    } catch {
      recent = fbRecents.length ? fbRecents : [];
    }
  } catch {
    try {
      const stored = localStorage.getItem('recentColors');
      recent = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(recent)) recent = [];
    } catch { recent = []; }
  }
  renderRecent();
}

async function addRecent(hex) {
  recent = [hex, ...recent.filter(c => c.toLowerCase() !== hex.toLowerCase())].slice(0, 20);
  // Persist locally for instant feedback
  try { localStorage.setItem('recentColors', JSON.stringify(recent)); } catch { /* storage unavailable */ }
  renderRecent();
  // Sync to Firebase async (fire-and-forget)
  syncRecentColors(recent).catch(() => {});
}

function renderRecent() {
  if (!recentEl) return;
  recentEl.innerHTML = '';
  recent.forEach(hex => {
    const swatch = document.createElement('div');
    swatch.className = 'color-swatch';
    swatch.style.background = hex;
    swatch.title = hex;
    swatch.addEventListener('click', () => { picker.value = hex; updateAll(hex); });
    recentEl.appendChild(swatch);
  });
}

// ---- Color update ----
function updateAll(hex) {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  if (preview) preview.style.background = hex;

  const rgb  = hexToRgb(hex);
  const hsl  = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('hexVal',  hex.toUpperCase());
  set('rgbVal',  `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
  set('hslVal',  `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
  set('cmykVal', `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`);
  set('cssVar',  `--color-primary: ${hex.toUpperCase()};`);
  set('colorName', getColorName(hex));
}

// ---- Events ----
picker?.addEventListener('input', () => updateAll(picker.value));
picker?.addEventListener('change', () => { addRecent(picker.value); });

// Copy buttons
document.querySelectorAll('.color-val-row').forEach(row => {
  row.querySelector('.copy-btn')?.addEventListener('click', async () => {
    const val = row.querySelector('.color-val-value')?.textContent;
    if (val) { await copyToClipboard(val); showToast('Copied!'); }
  });
});

// Eyedropper API
document.getElementById('eyedropperBtn')?.addEventListener('click', async () => {
  if (!window.EyeDropper) { showToast('Eyedropper not supported in this browser'); return; }
  try {
    const { sRGBHex } = await new EyeDropper().open();
    picker.value = sRGBHex;
    updateAll(sRGBHex);
    await addRecent(sRGBHex);
  } catch { /* user cancelled */ }
});

// ---- Init ----
initRecents();
updateAll(picker?.value ?? '#10B981');
