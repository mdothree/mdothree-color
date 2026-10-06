// js/pages/palette-generator.js — Palette Generator (Firebase + Stripe)
import { generatePalette, randomPalette, SCHEMES } from '../services/paletteGenerator.js';
import { withLoading, showToast as uiToast, showError } from '../utils/ui-helpers.js';
import { hexToRgb, rgbToHsl }                      from '../services/colorConverter.js';
import { savePalette, loadPalettes, deletePalette } from '../services/paletteStorage.js';
import { showToast, copyToClipboard, isDark }       from '../utils/colorUtils.js';
import { initSubscription, onSubscriptionChange }   from '../services/subscriptionService.js';
import { proGate, handleStripeReturn, proBadge }    from '../services/paywallUI.js';
import { onAuthChange, ensureAnonymousUser }         from '../config/config.js';
import { promptModal }                                from '../utils/inline-modal.js';

initSubscription();
handleStripeReturn();
ensureAnonymousUser().then(refreshSavedPalettes);

// Pro badge only for a real Pro entitlement (anonymous sign-in is not Pro).
onSubscriptionChange(status => {
  const nav = document.querySelector('.tool-nav');
  if (!nav) return;
  const existing = nav.querySelector('.pro-badge');
  if (status.isPro && !existing) nav.appendChild(proBadge());
  else if (!status.isPro && existing) existing.remove();
});

onSubscriptionChange(status => {
  document.getElementById('syncStatus').textContent = 'Saved in this browser only';
});

// ---- Scheme selector ----
const schemeEl = document.getElementById('scheme');
SCHEMES.forEach(s => {
  const o = document.createElement('option');
  o.value = s.value;
  o.textContent = s.label;
  schemeEl.appendChild(o);
});

let currentColors = [];

function render(colors) {
  currentColors = colors;
  const grid    = document.getElementById('paletteDisplay');
  grid.innerHTML = '';

  colors.forEach(hex => {
    const item = document.createElement('div');
    item.className = 'palette-item';
    item.innerHTML = `
      <div class="palette-swatch" style="background:${hex}"></div>
      <div class="palette-label">
        <span>${hex.toUpperCase()}</span>
        <button class="copy-hex-btn" aria-label="Copy ${hex.toUpperCase()}">⎘</button>
      </div>
    `;
    item.querySelector('.copy-hex-btn').addEventListener('click', async e => {
      e.stopPropagation();
      showToast((await copyToClipboard(hex.toUpperCase())) ? 'Copied ' + hex.toUpperCase() : 'Copy failed');
    });
    grid.appendChild(item);
  });

  // Export buttons
  const exportRow = document.getElementById('exportRow');
  exportRow.innerHTML = '';

  const cssBtn  = document.createElement('button');
  cssBtn.className = 'btn-ghost';
  cssBtn.textContent = 'Copy as CSS vars';
  cssBtn.addEventListener('click', async () => {
    if (!await proGate('color.export_formats')) return;
    const css = colors.map((c, i) => `  --color-${i + 1}: ${c.toUpperCase()};`).join('\n');
    showToast((await copyToClipboard(`:root {\n${css}\n}`)) ? 'CSS vars copied!' : 'Copy failed');
  });

  const jsonBtn = document.createElement('button');
  jsonBtn.className = 'btn-ghost';
  jsonBtn.textContent = 'Copy as JSON';
  jsonBtn.addEventListener('click', async () => {
    if (!await proGate('color.export_formats')) return;
    showToast((await copyToClipboard(JSON.stringify(colors, null, 2))) ? 'JSON copied!' : 'Copy failed');
  });

  exportRow.appendChild(cssBtn);
  exportRow.appendChild(jsonBtn);
}

document.getElementById('genPalette').addEventListener('click', withLoading(document.getElementById('genPalette'), 'Generating…', async () => {
  render(generatePalette(document.getElementById('baseColor').value, schemeEl.value));
}));

document.getElementById('randomBtn').addEventListener('click', () => {
  render(randomPalette(schemeEl.value));
});

document.getElementById('savePaletteBtn').addEventListener('click', withLoading(document.getElementById('savePaletteBtn'), 'Saving…', async () => {
  if (!currentColors.length) { showToast('Generate a palette first'); return; }

  const existing = await loadPalettes();
  if (existing.length >= 3 && !await proGate('color.palette_limit')) return;

  const name = await promptModal(
    'Palette name:',
    schemeEl.options[schemeEl.selectedIndex].text + ' palette'
  );
  if (name === null) return;  // user cancelled

  await savePalette({ name, colors: currentColors, scheme: schemeEl.value });
  await refreshSavedPalettes();
  showToast('Palette saved!');
}));

async function refreshSavedPalettes() {
  const list     = document.getElementById('savedPalettesList');
  const palettes = await loadPalettes();
  list.innerHTML = '';

  if (!palettes.length) {
    list.innerHTML = '<p class="empty-state">No saved palettes yet.</p>';
    return;
  }

  palettes.forEach(p => {
    const row = document.createElement('div');
    row.className = 'saved-palette-row';
    row.innerHTML = `
      <div class="saved-palette-swatches"></div>
      <span class="saved-palette-name"></span>
      <button class="btn-ghost btn-xs load-palette-btn">Load</button>
      <button class="del-btn" aria-label="Delete palette">✕</button>
    `;
    // Name and colors come from storage/user input: build with DOM APIs, never HTML strings.
    const swatchWrap = row.querySelector('.saved-palette-swatches');
    p.colors.forEach(c => {
      const sw = document.createElement('div');
      sw.className = 'saved-palette-swatch';
      sw.style.background = String(c);
      sw.title = String(c);
      swatchWrap.appendChild(sw);
    });
    row.querySelector('.saved-palette-name').textContent = String(p.name ?? '');
    row.querySelector('.load-palette-btn').addEventListener('click', () => render(p.colors));
    row.querySelector('.del-btn').addEventListener('click', async () => {
      await deletePalette(p.id);
      await refreshSavedPalettes();
    });
    list.appendChild(row);
  });
}

// Initial render
render(generatePalette('#10B981', 'triadic'));

// Global error boundary — catch unhandled promise rejections
window.addEventListener('unhandledrejection', event => {
  console.error('[mdothree] Unhandled promise rejection:', event.reason);
  uiToast(event.reason?.message || 'An unexpected error occurred', 'error');
  event.preventDefault();
});
