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
onAuthChange(u => { authBadge.textContent = u ? '● signed in' : '○ offline'; });

// ---- Elements ----
const picker    = document.getElementById('colorPicker');
const preview   = document.getElementById('colorPreview');
const recentEl  = document.getElementById('recentColors');

// ---- Recent colors (localStorage only; never uploaded) ----
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
  syncRecentColors(recent).catch(() => {});
}

function renderRecent() {
  if (!recentEl) return;
  recentEl.innerHTML = '';
  recent.forEach(hex => {
    const swatch = document.createElement('button'); // focusable + keyboard-activatable
    swatch.type = 'button';
    swatch.className = 'color-swatch';
    swatch.style.background = hex;
    swatch.title = hex;
    swatch.setAttribute('aria-label', `Use recent color ${hex}`);
    swatch.addEventListener('click', () => { picker.value = hex; updateAll(hex); });
    recentEl.appendChild(swatch);
  });
}

// ---- Color update ----
function updateAll(hex) {
  if (!hex) return;
  // Normalize whatever the picker emits (3/6/8-digit, any case) to #RRGGBB
  const m = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(hex.trim());
  if (!m) return;
  let h = m[1];
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length === 8) h = h.slice(0, 6); // drop alpha
  hex = '#' + h.toLowerCase();
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
picker?.addEventListener('change', () => { updateAll(picker.value); addRecent(picker.value); });

// Copy buttons
document.querySelectorAll('.color-val-row').forEach(row => {
  row.querySelector('.copy-btn')?.addEventListener('click', async () => {
    const val = row.querySelector('.color-val-value')?.textContent;
    if (val) { showToast((await copyToClipboard(val)) ? 'Copied!' : 'Copy failed'); }
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
