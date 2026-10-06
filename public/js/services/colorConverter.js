// services/colorConverter.js
// Full color conversion: HEX ↔ RGB ↔ HSL ↔ CMYK

// ---- HEX ----
export function hexToRgb(hex) {
  let clean = String(hex).trim().replace(/^#/, '');
  // #RGBA / #RRGGBBAA: drop the alpha channel instead of mis-reading the digits
  if (clean.length === 4) clean = clean.slice(0, 3);
  if (clean.length === 8) clean = clean.slice(0, 6);
  const full  = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** True for #RGB, #RGBA, #RRGGBB, #RRGGBBAA (leading # optional). */
export function isValidHex(hex) {
  return /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(hex).trim());
}

/** Normalise any valid hex to lowercase #rrggbb (alpha dropped). Throws on invalid input. */
export function normalizeHex(hex) {
  if (!isValidHex(hex)) throw new Error(`"${String(hex).trim()}" is not a valid hex color (use #RGB or #RRGGBB)`);
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex(r, g, b);
}

export function rgbToHex(r, g, b) {
  // clamp to 0–255 and round, so out-of-range input can never produce an invalid hex string
  return '#' + [r, g, b].map(v => Math.min(255, Math.max(0, Math.round(Number(v) || 0))).toString(16).padStart(2, '0')).join('');
}

// ---- HSL ----
export function rgbToHsl(r, g, b) {
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

export function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}
function hue2rgb(p, q, t) {
  if (t < 0) t += 1; if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

// ---- CMYK ----
export function rgbToCmyk(r, g, b) {
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

export function cmykToRgb(c, m, y, k) {
  c /= 100; m /= 100; y /= 100; k /= 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

// ---- HSV ----
export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max - min;
  let h;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (max === min) { h = 0; }
  else {
    switch (max) {
      case r: h = ((g-b)/d + (g<b?6:0))/6; break;
      case g: h = ((b-r)/d+2)/6; break;
      case b: h = ((r-g)/d+4)/6; break;
    }
  }
  return { h: Math.round(h*360), s: Math.round(s*100), v: Math.round(v*100) };
}

/**
 * Convert any input to all formats
 * @param {string} hex
 * @returns {{ hex, rgb, hsl, cmyk, hsv, css }}
 */
export function convertAll(hex) {
  const rgb  = hexToRgb(hex);
  const hsl  = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const cmyk = rgbToCmyk(rgb.r, rgb.g, rgb.b);
  const hsv  = rgbToHsv(rgb.r, rgb.g, rgb.b);
  return {
    hex:  hex.toUpperCase(),
    rgb:  `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`,
    hsl:  `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`,
    cmyk: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    hsv:  `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`,
    css:  `color: ${hex.toUpperCase()};`,
    raw:  { rgb, hsl, cmyk, hsv },
  };
}

// ---- Color name approximation ----
const NAMED = [
  ['#FF0000','Red'],['#00FF00','Lime'],['#0000FF','Blue'],['#FFFF00','Yellow'],
  ['#FF00FF','Magenta'],['#00FFFF','Cyan'],['#FFFFFF','White'],['#000000','Black'],
  ['#FFA500','Orange'],['#800080','Purple'],['#008000','Green'],['#800000','Maroon'],
  ['#008080','Teal'],['#000080','Navy'],['#FFC0CB','Pink'],['#A52A2A','Brown'],
  ['#808080','Gray'],['#C0C0C0','Silver'],['#FFD700','Gold'],['#10B981','Emerald'],
  ['#3B82F6','Blue 500'],['#EF4444','Red 500'],['#F59E0B','Amber 500'],
  ['#8B5CF6','Violet 500'],['#EC4899','Pink 500'],['#14B8A6','Teal 500'],
];

export function getColorName(hex) {
  const rgb = hexToRgb(hex);
  let minDist = Infinity, name = 'Custom Color';
  for (const [h, n] of NAMED) {
    const c = hexToRgb(h);
    const d = Math.sqrt((rgb.r-c.r)**2 + (rgb.g-c.g)**2 + (rgb.b-c.b)**2);
    if (d < minDist) { minDist = d; name = n; }
  }
  return name;
}

// ---- Contrast ----
function luminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/** Unrounded contrast ratio — use this for WCAG pass/fail (WCAG says not to round). */
export function contrastRatioRaw(hex1, hex2) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const l1 = luminance(c1.r, c1.g, c1.b);
  const l2 = luminance(c2.r, c2.g, c2.b);
  const lighter = Math.max(l1, l2), darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Contrast ratio for display, truncated (not rounded) to 2 decimals so 4.496 shows 4.49, never 4.5. */
export function contrastRatio(hex1, hex2) {
  return Math.floor(contrastRatioRaw(hex1, hex2) * 100 + 1e-9) / 100;
}

export function wcagLevel(ratio) {
  return {
    aa_normal:  ratio >= 4.5,
    aaa_normal: ratio >= 7,
    aa_large:   ratio >= 3,
    aaa_large:  ratio >= 4.5,
  };
}

// ---- Shade generation ----
export function generateShades(hex, steps = 10) {
  const rgb = hexToRgb(hex);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const shades = [];

  for (let i = 0; i <= steps; i++) {
    const lightness = Math.round((i / steps) * 95 + 2);
    const shade = hslToRgb(hsl.h, hsl.s, lightness);
    shades.push(rgbToHex(shade.r, shade.g, shade.b));
  }
  return shades;
}

// ---- Color mixing ----
export function mixColors(hex1, hex2, ratio = 0.5) {
  const c1 = hexToRgb(hex1), c2 = hexToRgb(hex2);
  const r = Math.round(c1.r * (1 - ratio) + c2.r * ratio);
  const g = Math.round(c1.g * (1 - ratio) + c2.g * ratio);
  const b = Math.round(c1.b * (1 - ratio) + c2.b * ratio);
  return rgbToHex(r, g, b);
}

// ---- Colorblind simulation ----
export function simulateColorblindness(hex, type) {
  const { r, g, b } = hexToRgb(hex);
  let nr, ng, nb;

  switch (type) {
    case 'protanopia':   // red-blind
      nr = 0.567 * r + 0.433 * g;
      ng = 0.558 * r + 0.442 * g;
      nb = 0.242 * g + 0.758 * b;
      break;
    case 'deuteranopia': // green-blind
      nr = 0.625 * r + 0.375 * g;
      ng = 0.7 * r + 0.3 * g;
      nb = 0.3 * g + 0.7 * b;
      break;
    case 'tritanopia':   // blue-blind
      nr = 0.95 * r + 0.05 * g;
      ng = 0.433 * g + 0.567 * b;
      nb = 0.475 * g + 0.525 * b;
      break;
    default:
      return hex;
  }
  return rgbToHex(Math.round(Math.min(255, Math.max(0, nr))), Math.round(Math.min(255, Math.max(0, ng))), Math.round(Math.min(255, Math.max(0, nb))));
}
