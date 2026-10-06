// js/pages/converter.js — Color Converter page logic
import { rgbToHex, hslToRgb, cmykToRgb, convertAll, getColorName, normalizeHex } from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard } from '../utils/colorUtils.js';
import { initSubscription, onSubscriptionChange } from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }               from '../config/config.js';

initSubscription();
handleStripeReturn();
// Pro badge only for a real Pro entitlement (anonymous sign-in is not Pro).
onSubscriptionChange(status => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  const existing = nav.querySelector('.pro-badge');
  if (status.isPro && !existing) nav.appendChild(proBadge());
  else if (!status.isPro && existing) existing.remove();
});

const NUM = '(-?\\d*\\.?\\d+)';
const SEP = '\\s*[,\\s]\\s*';
const ALPHA = '(?:\\s*[,/]\\s*[\\d.]+%?)?';
const RE = {
  rgb:  new RegExp(`^(?:rgba?\\s*\\()?\\s*${NUM}${SEP}${NUM}${SEP}${NUM}${ALPHA}\\s*\\)?$`, 'i'),
  hsl:  new RegExp(`^(?:hsla?\\s*\\()?\\s*${NUM}(?:deg)?${SEP}${NUM}%?${SEP}${NUM}%?${ALPHA}\\s*\\)?$`, 'i'),
  cmyk: new RegExp(`^(?:cmyk\\s*\\()?\\s*${NUM}%?${SEP}${NUM}%?${SEP}${NUM}%?${SEP}${NUM}%?\\s*\\)?$`, 'i'),
};

/** Detect the format from an explicit prefix ("#", "rgb(", "hsl(", "cmyk("); null if ambiguous. */
function detectFormat(val) {
  const v = val.trim().toLowerCase();
  if (v.startsWith('#')) return 'hex';
  if (/^rgba?\s*\(/.test(v)) return 'rgb';
  if (/^hsla?\s*\(/.test(v)) return 'hsl';
  if (/^cmyk\s*\(/.test(v)) return 'cmyk';
  return null;
}

function inRange(vals, max, name) {
  vals.forEach((v, i) => {
    if (!(v >= 0 && v <= max[i])) throw new Error(`${name} values out of range (expected ${max.map(m => '0–' + m).join(', ')})`);
  });
}

export function parseToHex(val, fmt) {
  val = val.trim();
  if (fmt === 'hex')  return normalizeHex(val);
  const m = val.match(RE[fmt] || /$^/);
  if (fmt === 'rgb')  {
    if (!m) throw new Error('Invalid RGB — use e.g. rgb(16, 185, 129)');
    const v = [+m[1], +m[2], +m[3]];
    inRange(v, [255, 255, 255], 'RGB');
    return rgbToHex(...v);
  }
  if (fmt === 'hsl')  {
    if (!m) throw new Error('Invalid HSL — use e.g. hsl(160, 84%, 39%)');
    const v = [+m[1], +m[2], +m[3]];
    inRange(v, [360, 100, 100], 'HSL');
    const rgb = hslToRgb(v[0] % 360, v[1], v[2]);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  if (fmt === 'cmyk') {
    if (!m) throw new Error('Invalid CMYK — use e.g. cmyk(91%, 0%, 30%, 27%)');
    const v = [+m[1], +m[2], +m[3], +m[4]];
    inRange(v, [100, 100, 100, 100], 'CMYK');
    const rgb = cmykToRgb(...v);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  throw new Error('Unknown format');
}

const inputEl   = document.getElementById('convInput');
const fromFmtEl = document.getElementById('fromFmt');
const toFmtEl   = document.getElementById('toFmt');
let lastAll = null;

function convert() {
  const val = inputEl.value;
  showError('', inputEl);
  if (!val.trim()) return;

  // Honour an explicit prefix (e.g. pasting "rgb(…)" while From = HEX) and sync the From selector.
  const detected = detectFormat(val);
  if (detected && detected !== fromFmtEl.value) fromFmtEl.value = detected;
  const fmt = fromFmtEl.value;

  let hex, all;
  try {
    hex = parseToHex(val, fmt);
    all = convertAll(hex);
  } catch (e) {
    lastAll = null;
    document.getElementById('convOutput').hidden = true;
    document.getElementById('convPreview').style.background = '';
    document.getElementById('convColorName').textContent = '';
    showError(e.message, inputEl);
    return;
  }
  lastAll = all;

  document.getElementById('convPreview').style.background = hex;
  document.getElementById('convColorName').textContent    = getColorName(hex);

  const rows = document.getElementById('convRows');
  rows.innerHTML = '';

  // Requested "To" format first and highlighted, then the rest.
  const target  = toFmtEl.value;
  const entries = Object.entries(all).filter(([k]) => k !== 'raw');
  entries.sort(([a], [b]) => (b === target) - (a === target));

  entries.forEach(([label, value]) => {
    const row = document.createElement('div');
    row.className = 'color-val-row' + (label === target ? ' color-val-row--target' : '');
    const lab = document.createElement('span');
    lab.className = 'color-val-label';
    lab.textContent = label;
    const v = document.createElement('span');
    v.className = 'color-val-value';
    v.textContent = value;
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.setAttribute('aria-label', `Copy ${label}`);
    btn.textContent = '⎘';
    btn.addEventListener('click', async () => {
      const ok = await copyToClipboard(value);
      showToast(ok ? 'Copied!' : 'Copy failed — select the value and copy manually');
    });
    row.append(lab, v, btn);
    rows.appendChild(row);
  });

  document.getElementById('convOutput').hidden = false;
}

document.getElementById('convertBtn').addEventListener('click', convert);
inputEl.addEventListener('keydown', e => { if (e.key === 'Enter') convert(); });
toFmtEl.addEventListener('change', () => { if (lastAll) convert(); });

// Swap: the converted "To" value becomes the new input, and From/To trade places.
document.getElementById('convSwap').addEventListener('click', () => {
  const a = fromFmtEl.value;
  const b = toFmtEl.value;
  if (lastAll && lastAll[b]) inputEl.value = lastAll[b];
  fromFmtEl.value = b;
  toFmtEl.value   = a;
  if (inputEl.value.trim()) convert();
});

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
