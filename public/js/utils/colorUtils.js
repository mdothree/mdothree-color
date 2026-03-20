// colorUtils.js — re-exports shared utils + color-specific helpers
export { showToast, copyToClipboard } from './ui-helpers.js';

export function isDark(hex) {
  const n = parseInt(hex.replace('#',''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
}
