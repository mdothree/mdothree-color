// tests/converter-validation.test.js — exercises the real colorConverter module.
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { hexToRgb, rgbToHex, isValidHex, normalizeHex, contrastRatio, contrastRatioRaw, wcagLevel } from '../public/js/services/colorConverter.js';

describe('hex handling', () => {
  it('8-digit hex drops alpha', () => assert.deepEqual(hexToRgb('#10B981FF'), { r: 16, g: 185, b: 129 }));
  it('4-digit hex drops alpha', () => assert.deepEqual(hexToRgb('#1b98'), { r: 0x11, g: 0xbb, b: 0x99 }));
  it('rejects invalid hex', () => { assert.equal(isValidHex('zzz'), false); assert.throws(() => normalizeHex('#12345')); });
  it('rgbToHex clamps', () => assert.equal(rgbToHex(300, -5, 12.5), '#ff000d'));
});

describe('WCAG uses the unrounded ratio', () => {
  it('4.4978 fails AA and displays 4.49', () => {
    assert.ok(contrastRatioRaw('#5864fe', '#ffffff') < 4.5);
    assert.equal(wcagLevel(contrastRatioRaw('#5864fe', '#ffffff')).aa_normal, false);
    assert.equal(contrastRatio('#5864fe', '#ffffff'), 4.49);
  });
  it('black/white = 21', () => assert.equal(contrastRatio('#000', '#fff'), 21));
});
