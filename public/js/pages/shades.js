// js/pages/shades.js — Shades Generator page logic
import { generateShades }               from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard, isDark } from '../utils/colorUtils.js';
import { initSubscription }             from '../services/subscriptionService.js';
import { proGate, proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }                 from '../config/config.js';

initSubscription();
handleStripeReturn();
onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
});

let lastShades = [];

document.getElementById('shadeSteps').addEventListener('input', () => {
  document.getElementById('stepsVal').textContent = document.getElementById('shadeSteps').value;
});

function renderShades(shades) {
  lastShades  = shades;
  const out   = document.getElementById('shadesOutput');
  out.innerHTML = '';

  shades.forEach((hex, i) => {
    const dark  = isDark(hex);
    const row   = document.createElement('div');
    row.className = 'shade-row';
    row.innerHTML = `
      <div class="shade-swatch" style="background:${hex}">
        <span class="shade-swatch-hex" style="color:${dark ? '#fff' : '#000'}">${hex.toUpperCase()}</span>
        <span class="shade-swatch-pct" style="color:${dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)'}">
          ${Math.round((i / (shades.length - 1)) * 100)}%
        </span>
      </div>
      <button class="btn-ghost copy-shade-btn" aria-label="Copy ${hex.toUpperCase()}">⎘ Copy</button>
    `;
    row.querySelector('.copy-shade-btn').addEventListener('click', async () => {
      await copyToClipboard(hex.toUpperCase());
      showToast(hex.toUpperCase() + ' copied!');
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
  await copyToClipboard(`:root {\n${css}\n}`);
  showToast('CSS vars copied!');
});

document.getElementById('exportSCSS').addEventListener('click', async () => {
  if (!lastShades.length) return;
  if (!await proGate('color.export_formats')) return;
  const scss = lastShades.map((c, i) => `$shade-${(i + 1) * 100}: ${c.toUpperCase()};`).join('\n');
  await copyToClipboard(scss);
  showToast('SCSS vars copied!');
});

// Auto-render on load
renderShades(generateShades('#10B981', 10));

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
