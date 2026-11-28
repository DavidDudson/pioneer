import { describe, expect, it } from 'vitest';

import { Elevation, elevationVariants } from './tokens';

describe('an elevation level', () => {
  it.each(Object.values(Elevation))('takes the %s surface and line from the same level', (level) => {
    expect(elevationVariants[level]).toBe(`bg-elevation-${level} border-elevation-${level}-line`);
  });
});
