// js/pages/colorblind.js — Colorblind Simulator page logic (Pro)
import { simulateColorblindness }       from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { copyToClipboard, showToast, isDark } from '../utils/colorUtils.js';
import { initSubscription }             from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }          from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

(async () => {
  const allowed = await proGate('color.colorblind');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'color.colorblind', 'Colorblind Simulator');
    return;
  }
  initPage();
})();

const TYPES = [
  { key: 'normal',       label: 'Normal Vision',  desc: 'How most people see it' },
  { key: 'protanopia',   label: 'Protanopia',      desc: 'Red-blind (~1% of males)' },
  { key: 'deuteranopia', label: 'Deuteranopia',    desc: 'Green-blind (~1% of males)' },
  { key: 'tritanopia',   label: 'Tritanopia',      desc: 'Blue-blind (rare)' },
];

function initPage() {
  const baseEl = document.getElementById('cbBase');

  function update() {
    const base = baseEl.value;
    const grid = document.getElementById('simGrid');
    grid.innerHTML = '';

    TYPES.forEach(({ key, label, desc }) => {
      const simColor  = key === 'normal' ? base : simulateColorblindness(base, key);
      const textColor = isDark(simColor) ? '#fff' : '#000';

      const card = document.createElement('div');
      card.className = 'sim-card';
      card.innerHTML = `
        <div class="sim-swatch" style="background:${simColor}">
          <span class="sim-hex" style="color:${textColor}">${simColor.toUpperCase()}</span>
        </div>
        <div class="sim-info">
          <div class="sim-label">${label}</div>
          <div class="sim-desc">${desc}</div>
        </div>
      `;
      card.addEventListener('click', async () => {
        showToast((await copyToClipboard(simColor.toUpperCase())) ? `${label}: ${simColor.toUpperCase()} copied!` : 'Copy failed');
      });
      grid.appendChild(card);
    });
  }

  baseEl.addEventListener('input', update);
  update();
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
