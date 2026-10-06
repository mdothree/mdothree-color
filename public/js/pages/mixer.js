// js/pages/mixer.js — Color Mixer page logic
import { mixColors }                    from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard }   from '../utils/colorUtils.js';
import { initSubscription, onSubscriptionChange } from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
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

const colorAEl  = document.getElementById('colorA');
const colorBEl  = document.getElementById('colorB');
const ratioEl   = document.getElementById('mixRatio');
const ratioValEl= document.getElementById('ratioVal');
const stripEl   = document.getElementById('mixStrip');
const hexEl     = document.getElementById('mixHex');
const previewEl = document.getElementById('mixPreview');

function updateMix() {
  const a     = colorAEl.value;
  const b     = colorBEl.value;
  const ratio = parseInt(ratioEl.value) / 100;
  ratioValEl.textContent = Math.round(ratio * 100);

  // Live strip — 11 stops
  stripEl.innerHTML = '';
  for (let i = 0; i <= 10; i++) {
    const c     = mixColors(a, b, i / 10);
    const block = document.createElement('div');
    block.className = 'mix-strip-block';
    block.style.background = c;
    block.title = c;
    stripEl.appendChild(block);
  }

  const mixed = mixColors(a, b, ratio);
  hexEl.textContent          = mixed.toUpperCase();
  previewEl.style.background = mixed;
}

[colorAEl, colorBEl, ratioEl].forEach(el => el.addEventListener('input', updateMix));

document.getElementById('copyMix').addEventListener('click', async () => {
  const hex = hexEl.textContent;
  showToast((await copyToClipboard(hex)) ? hex + ' copied!' : 'Copy failed');
});

hexEl.addEventListener('click', async () => {
  showToast((await copyToClipboard(hexEl.textContent)) ? 'Copied!' : 'Copy failed');
});

updateMix();

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
