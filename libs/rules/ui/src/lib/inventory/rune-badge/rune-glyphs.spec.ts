import { RUNIC_LETTERS } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { FUNDAMENTAL_GLYPHS } from './rune-glyphs';

describe('the fundamental glyphs', () => {
  it('give each fundamental rune its own single Runic letter', () => {
    const glyphs = Object.values(FUNDAMENTAL_GLYPHS);

    expect(new Set(glyphs).size).toBe(glyphs.length);
    expect(glyphs.filter((glyph) => RUNIC_LETTERS.includes(glyph))).toHaveLength(glyphs.length);
  });
});
