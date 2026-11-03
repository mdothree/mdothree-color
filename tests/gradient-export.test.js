import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { gradientTailwind } from '../public/js/services/gradientGenerator.js';

const S = ['#ff0000', '#0000ff'];
describe('gradientTailwind honours type and direction', () => {
  it('default is left-to-right', () => assert.equal(gradientTailwind(S), 'bg-gradient-to-r from-[#ff0000] to-[#0000ff]'));
  it('180deg is to-b', () => assert.match(gradientTailwind(S, 'linear', 180), /^bg-gradient-to-b /));
  it('135deg is to-br', () => assert.match(gradientTailwind(S, 'linear', 135), /^bg-gradient-to-br /));
  it('odd angle uses arbitrary linear-gradient', () => assert.equal(gradientTailwind(S, 'linear', 100), 'bg-[linear-gradient(100deg,#ff0000_0%,#0000ff_100%)]'));
  it('radial is exported as radial', () => assert.match(gradientTailwind(S, 'radial'), /^bg-\[radial-gradient\(circle,/));
  it('conic is exported as conic', () => assert.match(gradientTailwind(S, 'conic'), /^bg-\[conic-gradient\(/));
});
