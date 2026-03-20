// services/paletteGenerator.js
import { hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from './colorConverter.js';

export function generatePalette(baseHex, scheme = 'complementary') {
  const rgb = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  const rotate = deg => {
    const c = hslToRgb((h + deg + 360) % 360, s, l);
    return rgbToHex(c.r, c.g, c.b);
  };

  switch (scheme) {
    case 'complementary':
      return [baseHex, rotate(180)];
    case 'analogous':
      return [rotate(-30), baseHex, rotate(30)];
    case 'triadic':
      return [baseHex, rotate(120), rotate(240)];
    case 'split-complementary':
      return [baseHex, rotate(150), rotate(210)];
    case 'tetradic':
      return [baseHex, rotate(90), rotate(180), rotate(270)];
    case 'monochromatic': {
      const steps = [10, 25, 40, 60, 75, 90];
      return steps.map(lightness => {
        const c = hslToRgb(h, s, lightness);
        return rgbToHex(c.r, c.g, c.b);
      });
    }
    default:
      return [baseHex];
  }
}

export function randomPalette(scheme = 'triadic') {
  const h = Math.floor(Math.random() * 360);
  const s = 55 + Math.floor(Math.random() * 35);
  const l = 40 + Math.floor(Math.random() * 25);
  const c = hslToRgb(h, s, l);
  return generatePalette(rgbToHex(c.r, c.g, c.b), scheme);
}

export const SCHEMES = [
  { value: 'complementary',      label: 'Complementary' },
  { value: 'analogous',          label: 'Analogous' },
  { value: 'triadic',            label: 'Triadic' },
  { value: 'split-complementary',label: 'Split Complementary' },
  { value: 'tetradic',           label: 'Tetradic' },
  { value: 'monochromatic',      label: 'Monochromatic' },
];
