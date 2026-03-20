// js/pages/converter.js — Color Converter page logic
import { hexToRgb, rgbToHex, hslToRgb, cmykToRgb, convertAll, getColorName } from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard } from '../utils/colorUtils.js';
import { initSubscription }           from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }               from '../config/config.js';

initSubscription();
handleStripeReturn();
onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
});

function parseToHex(val, fmt) {
  val = val.trim();
  if (fmt === 'hex')  return val.startsWith('#') ? val : '#' + val;
  if (fmt === 'rgb')  {
    const m = val.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
    if (!m) throw new Error('Invalid RGB');
    return rgbToHex(+m[1], +m[2], +m[3]);
  }
  if (fmt === 'hsl')  {
    const m = val.match(/(\d+)[,\s]+(\d+)%?[,\s]+(\d+)%?/);
    if (!m) throw new Error('Invalid HSL');
    const rgb = hslToRgb(+m[1], +m[2], +m[3]);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  if (fmt === 'cmyk') {
    const m = val.match(/(\d+)%?[,\s]+(\d+)%?[,\s]+(\d+)%?[,\s]+(\d+)%?/);
    if (!m) throw new Error('Invalid CMYK');
    const rgb = cmykToRgb(+m[1], +m[2], +m[3], +m[4]);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  }
  throw new Error('Unknown format');
}

document.getElementById('convertBtn').addEventListener('click', () => {
  const val = document.getElementById('convInput').value;
  const fmt = document.getElementById('fromFmt').value;
  if (!val) return;

  try {
    const hex = parseToHex(val, fmt);
    const all = convertAll(hex);

    document.getElementById('convPreview').style.background = hex;
    document.getElementById('convColorName').textContent    = getColorName(hex);

    const rows = document.getElementById('convRows');
    rows.innerHTML = '';

    Object.entries(all).filter(([k]) => k !== 'raw').forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'color-val-row';
      row.innerHTML = `
        <span class="color-val-label">${label}</span>
        <span class="color-val-value">${value}</span>
        <button class="copy-btn" aria-label="Copy ${label}">⎘</button>
      `;
      row.querySelector('.copy-btn').addEventListener('click', async () => {
        await copyToClipboard(value);
        showToast('Copied!');
      });
      rows.appendChild(row);
    });

    document.getElementById('convOutput').hidden = false;
  } catch (e) {
    showToast('Error: ' + e.message);
  }
});

document.getElementById('convSwap').addEventListener('click', () => {
  const a = document.getElementById('fromFmt').value;
  const b = document.getElementById('toFmt').value;
  document.getElementById('fromFmt').value = b;
  document.getElementById('toFmt').value   = a;
});

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
