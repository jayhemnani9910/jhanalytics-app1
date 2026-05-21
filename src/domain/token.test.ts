import { describe, it, expect } from 'vitest';
import { generateToken } from './token';

describe('generateToken', () => {
  it('returns a 4-digit string', () => {
    const t = generateToken(new Set(), () => 0.12345);
    expect(t).toMatch(/^\d{4}$/);
  });
  it('avoids tokens already in use, regenerating', () => {
    const values = [0.1, 0.1, 0.5]; // first two map to the same code
    let i = 0;
    const rng = () => values[i++];
    const taken = new Set([code(0.1)]);
    const t = generateToken(taken, rng);
    expect(taken.has(t)).toBe(false);
  });
});

// mirror of the production mapping, used only to set up the test
function code(r: number): string {
  return String(1000 + Math.floor(r * 9000));
}
