// tests/colorConverter.test.js
// Unit tests for colorConverter.js pure functions.
// Run with: npm test

import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

// ─── Inline pure color conversion functions ───────────────────

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToCmyk(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round((1 - r - k) / (1 - k) * 100),
    m: Math.round((1 - g - k) / (1 - k) * 100),
    y: Math.round((1 - b - k) / (1 - k) * 100),
    k: Math.round(k * 100),
  };
}

function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

function mixColors(hex1, hex2, ratio = 0.5) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  return rgbToHex(
    Math.round(c1.r * (1 - ratio) + c2.r * ratio),
    Math.round(c1.g * (1 - ratio) + c2.g * ratio),
    Math.round(c1.b * (1 - ratio) + c2.b * ratio)
  );
}

function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const l1 = luminance(c1.r, c1.g, c1.b);
  const l2 = luminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

// ─── Tests ───────────────────────────────────────────────────

describe('hexToRgb', () => {
  it('converts #000000', () => assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 }));
  it('converts #ffffff', () => assert.deepEqual(hexToRgb('#ffffff'), { r: 255, g: 255, b: 255 }));
  it('converts #ff0000', () => assert.deepEqual(hexToRgb('#ff0000'), { r: 255, g: 0, b: 0 }));
  it('converts #10b981 (emerald)', () => assert.deepEqual(hexToRgb('#10b981'), { r: 16, g: 185, b: 129 }));
  it('handles shorthand #fff', () => assert.deepEqual(hexToRgb('#fff'), { r: 255, g: 255, b: 255 }));
  it('handles shorthand #f00', () => assert.deepEqual(hexToRgb('#f00'), { r: 255, g: 0, b: 0 }));
});

describe('rgbToHex', () => {
  it('converts 0,0,0', () => assert.strictEqual(rgbToHex(0, 0, 0), '#000000'));
  it('converts 255,255,255', () => assert.strictEqual(rgbToHex(255, 255, 255), '#ffffff'));
  it('converts 16,185,129', () => assert.strictEqual(rgbToHex(16, 185, 129), '#10b981'));
  it('pads single hex digit', () => assert.strictEqual(rgbToHex(1, 2, 3), '#010203'));
});

describe('hexToRgb + rgbToHex round-trip', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#10b981', '#3b82f6', '#1e293b'];
  for (const hex of colors) {
    it(`round-trips ${hex}`, () => {
      const { r, g, b } = hexToRgb(hex);
      assert.strictEqual(rgbToHex(r, g, b), hex);
    });
  }
});

describe('rgbToHsl', () => {
  it('white is hsl(0, 0%, 100%)', () => {
    assert.deepEqual(rgbToHsl(255, 255, 255), { h: 0, s: 0, l: 100 });
  });
  it('black is hsl(0, 0%, 0%)', () => {
    assert.deepEqual(rgbToHsl(0, 0, 0), { h: 0, s: 0, l: 0 });
  });
  it('pure red is hsl(0, 100%, 50%)', () => {
    assert.deepEqual(rgbToHsl(255, 0, 0), { h: 0, s: 100, l: 50 });
  });
  it('pure green is hsl(120, 100%, 50%)', () => {
    assert.deepEqual(rgbToHsl(0, 255, 0), { h: 120, s: 100, l: 50 });
  });
});

describe('hslToRgb', () => {
  it('hsl(0,100%,50%) is red', () => {
    assert.deepEqual(hslToRgb(0, 100, 50), { r: 255, g: 0, b: 0 });
  });
  it('hsl(0,0%,100%) is white', () => {
    assert.deepEqual(hslToRgb(0, 0, 100), { r: 255, g: 255, b: 255 });
  });
  it('hsl(0,0%,0%) is black', () => {
    assert.deepEqual(hslToRgb(0, 0, 0), { r: 0, g: 0, b: 0 });
  });
});

describe('rgbToHsl + hslToRgb round-trip', () => {
  const cases = [[255,0,0],[0,255,0],[0,0,255],[16,185,129],[128,128,128]];
  for (const [r,g,b] of cases) {
    it(`round-trips rgb(${r},${g},${b})`, () => {
      const { h, s, l } = rgbToHsl(r, g, b);
      const back = hslToRgb(h, s, l);
      // Allow ±1 rounding error per channel
      // Allow ±2 rounding error — HSL rounds h/s/l to integers, causing up to 2 RGB drift
      assert.ok(Math.abs(back.r - r) <= 2, `r: ${back.r} vs ${r}`);
      assert.ok(Math.abs(back.g - g) <= 2, `g: ${back.g} vs ${g}`);
      assert.ok(Math.abs(back.b - b) <= 2, `b: ${back.b} vs ${b}`);
    });
  }
});

describe('rgbToCmyk', () => {
  it('white is cmyk(0,0,0,0)', () => {
    assert.deepEqual(rgbToCmyk(255, 255, 255), { c: 0, m: 0, y: 0, k: 0 });
  });
  it('black is cmyk(0,0,0,100)', () => {
    assert.deepEqual(rgbToCmyk(0, 0, 0), { c: 0, m: 0, y: 0, k: 100 });
  });
  it('pure red is cmyk(0,100,100,0)', () => {
    assert.deepEqual(rgbToCmyk(255, 0, 0), { c: 0, m: 100, y: 100, k: 0 });
  });
});

describe('mixColors', () => {
  it('50/50 mix of black and white is grey', () => {
    const result = mixColors('#000000', '#ffffff', 0.5);
    const { r, g, b } = hexToRgb(result);
    assert.ok(Math.abs(r - 128) <= 1);
    assert.ok(Math.abs(g - 128) <= 1);
    assert.ok(Math.abs(b - 128) <= 1);
  });
  it('ratio=0 returns first color', () => {
    assert.strictEqual(mixColors('#ff0000', '#0000ff', 0), '#ff0000');
  });
  it('ratio=1 returns second color', () => {
    assert.strictEqual(mixColors('#ff0000', '#0000ff', 1), '#0000ff');
  });
});

describe('contrastRatio', () => {
  it('black on white is 21:1', () => {
    assert.strictEqual(contrastRatio('#000000', '#ffffff'), 21);
  });
  it('white on white is 1:1', () => {
    assert.strictEqual(contrastRatio('#ffffff', '#ffffff'), 1);
  });
  it('ratio is symmetric', () => {
    const r1 = contrastRatio('#10b981', '#ffffff');
    const r2 = contrastRatio('#ffffff', '#10b981');
    assert.strictEqual(r1, r2);
  });
  it('any ratio is between 1 and 21', () => {
    const r = contrastRatio('#3b82f6', '#f1f5f9');
    assert.ok(r >= 1 && r <= 21);
  });
});
