// js/pages/gradient.js — Gradient Generator page logic (Pro)
import { linearGradientCSS, radialGradientCSS, conicGradientCSS, gradientTailwind } from '../services/gradientGenerator.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { showToast, copyToClipboard }   from '../utils/colorUtils.js';
import { initSubscription }             from '../services/subscriptionService.js';
import { proGate, lockElement, handleStripeReturn } from '../services/paywallUI.js';
import { ensureAnonymousUser }          from '../config/config.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser();

(async () => {
  const allowed = await proGate('color.gradient');
  if (!allowed) {
    const body = document.querySelector('.tool-body');
    if (body) lockElement(body, 'color.gradient', 'Gradient Generator');
    return;
  }
  initPage();
})();

function initPage() {
  function getStops() {
    const use3 = document.getElementById('use3').checked;
    return use3
      ? [document.getElementById('gc1').value, document.getElementById('gc3').value, document.getElementById('gc2').value]
      : [document.getElementById('gc1').value, document.getElementById('gc2').value];
  }

  function update() {
    const stops  = getStops();
    const type   = document.getElementById('gradType').value;
    const angle  = parseInt(document.getElementById('gradAngle').value);
    document.getElementById('angleVal').textContent = angle;
    document.getElementById('angleGroup').hidden    = type !== 'linear';

    let css;
    if (type === 'linear')      css = linearGradientCSS(stops, angle);
    else if (type === 'radial') css = radialGradientCSS(stops);
    else                        css = conicGradientCSS(stops);

    document.getElementById('gradPreview').style.background = css;
    document.getElementById('gradCSS').textContent = 'background: ' + css + ';';
  }

  ['gc1', 'gc2', 'gc3', 'gradType', 'gradAngle', 'use3'].forEach(id => {
    document.getElementById(id).addEventListener('input', update);
    document.getElementById(id).addEventListener('change', update);
  });

  document.getElementById('copyGradCSS').addEventListener('click', async () => {
    await copyToClipboard(document.getElementById('gradCSS').textContent);
    showToast('CSS copied!');
  });

  document.getElementById('copyGradTw').addEventListener('click', async () => {
    const tw = gradientTailwind(getStops());
    await copyToClipboard(tw);
    showToast('Tailwind class copied!');
  });

  update();
}

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
