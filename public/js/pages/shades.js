// js/pages/shades.js — Shades Generator page logic
import { generateShades }               from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard, isDark } from '../utils/colorUtils.js';
import { initSubscription, onSubscriptionChange } from '../services/subscriptionService.js';
import { proGate, proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }                 from '../config/config.js';

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

let lastShades = [];

document.getElementById('shadeSteps').addEventListener('input', () => {
  document.getElementById('stepsVal').textContent = document.getElementById('shadeSteps').value;
});

// VISUAL-QA 2026-10-13: label colour = whichever of black/white has the higher WCAG contrast on the swatch.
// The old isDark() split plus 45-60% alpha left the % labels at 2.4-3.7:1 on mid-tone swatches.
function bestTextOn(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return '#000';
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return (L + 0.05) / 0.05 >= 1.05 / (L + 0.05) ? '#000' : '#fff';
}

function renderShades(shades) {
  lastShades  = shades;
  const out   = document.getElementById('shadesOutput');
  out.innerHTML = '';

  shades.forEach((hex, i) => {
    const fg    = bestTextOn(hex);
    const row   = document.createElement('div');
    row.className = 'shade-row';
    row.innerHTML = `
      <div class="shade-swatch" style="background:${hex}">
        <span class="shade-swatch-hex" style="color:${fg}">${hex.toUpperCase()}</span>
        <span class="shade-swatch-pct" style="color:${fg}">
          ${Math.round((i / (shades.length - 1)) * 100)}%
        </span>
      </div>
      <button class="btn-ghost copy-shade-btn" aria-label="Copy ${hex.toUpperCase()}">⎘ Copy</button>
    `;
    row.querySelector('.copy-shade-btn').addEventListener('click', async () => {
      showToast((await copyToClipboard(hex.toUpperCase())) ? hex.toUpperCase() + ' copied!' : 'Copy failed');
    });
    out.appendChild(row);
  });

  document.getElementById('exportShades').hidden = false;
}

document.getElementById('genShades').addEventListener('click', () => {
  const base  = document.getElementById('shadeBase').value;
  const steps = parseInt(document.getElementById('shadeSteps').value);
  renderShades(generateShades(base, steps));
});

document.getElementById('exportCSS').addEventListener('click', async () => {
  if (!lastShades.length) return;
  if (!await proGate('color.export_formats')) return;
  const css = lastShades.map((c, i) => `  --shade-${(i + 1) * 100}: ${c.toUpperCase()};`).join('\n');
  showToast((await copyToClipboard(`:root {\n${css}\n}`)) ? 'CSS vars copied!' : 'Copy failed');
});

document.getElementById('exportSCSS').addEventListener('click', async () => {
  if (!lastShades.length) return;
  if (!await proGate('color.export_formats')) return;
  const scss = lastShades.map((c, i) => `$shade-${(i + 1) * 100}: ${c.toUpperCase()};`).join('\n');
  showToast((await copyToClipboard(scss)) ? 'SCSS vars copied!' : 'Copy failed');
});

// Auto-render on load
renderShades(generateShades('#10B981', 10));

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
