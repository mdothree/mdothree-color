// js/pages/contrast.js — Contrast Checker page logic
import { contrastRatio, wcagLevel }     from '../services/colorConverter.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { initSubscription }             from '../services/subscriptionService.js';
import { proBadge, handleStripeReturn } from '../services/paywallUI.js';
import { onAuthChange }                 from '../config/config.js';

initSubscription();
handleStripeReturn();
onAuthChange(u => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  if (u && !nav.querySelector('.pro-badge')) nav.appendChild(proBadge());
});

const fgEl      = document.getElementById('fgColor');
const bgEl      = document.getElementById('bgColor');
const previewEl = document.getElementById('contrastPreview');
const scoreEl   = document.getElementById('contrastScore');
const badgesEl  = document.getElementById('wcagBadges');

function update() {
  const fg = fgEl.value;
  const bg = bgEl.value;

  previewEl.style.background = bg;
  previewEl.style.color      = fg;
  document.getElementById('previewLarge').style.color = fg;
  document.getElementById('previewSmall').style.color = fg;

  const ratio  = contrastRatio(fg, bg);
  const levels = wcagLevel(ratio);

  scoreEl.textContent = ratio + ':1';
  scoreEl.style.color = ratio >= 7 ? 'var(--emerald)' : ratio >= 4.5 ? '#22C55E' : ratio >= 3 ? '#F59E0B' : '#EF4444';

  badgesEl.innerHTML = '';
  [
    { label: 'AA Normal',  pass: levels.aa_normal,  req: 4.5 },
    { label: 'AAA Normal', pass: levels.aaa_normal, req: 7   },
    { label: 'AA Large',   pass: levels.aa_large,   req: 3   },
    { label: 'AAA Large',  pass: levels.aaa_large,  req: 4.5 },
  ].forEach(c => {
    const badge = document.createElement('span');
    badge.className = 'wcag-badge ' + (c.pass ? 'wcag-pass' : 'wcag-fail');
    badge.textContent = (c.pass ? '✓ ' : '✗ ') + c.label + ` (≥${c.req}:1)`;
    badgesEl.appendChild(badge);
  });
}

[fgEl, bgEl].forEach(el => el.addEventListener('input', update));
update();

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
