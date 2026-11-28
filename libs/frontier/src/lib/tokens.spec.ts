import { describe, expect, it } from 'vitest';

import { Elevation, elevationVariants, GapRole, gapVariants } from './tokens';

describe('an elevation level', () => {
  it.each(Object.values(Elevation))('takes the %s surface and line from the same level', (level) => {
    expect(elevationVariants[level]).toBe(`bg-elevation-${level} border-elevation-${level}-line`);
  });
});

describe('the gap ladder', () => {
  it.each(Object.entries(GapRole))('maps the %s role to a gap token with a class', (_role, space) => {
    expect(gapVariants[space]).toBe(`gap-${space}`);
  });

  it('steps up from text to page', () => {
    expect([GapRole.Text, GapRole.Row, GapRole.Card, GapRole.Page]).toStrictEqual(['2xs', 'sm', 'md', 'xl']);
  });
});
