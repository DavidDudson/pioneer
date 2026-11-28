import { describe, expect, it } from 'vitest';

import { overlayPositions } from './overlay-positions';

describe(overlayPositions, () => {
  it('opens below the origin, pushed down by the gap', () => {
    const [below] = overlayPositions('start');

    expect(below).toMatchObject({ originY: 'bottom', overlayY: 'top', offsetY: 4 });
  });

  it('keeps the same gap when it flips above the origin', () => {
    const [, above] = overlayPositions('start');

    expect(above).toMatchObject({ originY: 'top', overlayY: 'bottom', offsetY: -4 });
  });

  it.each(['start', 'end'] as const)('lines both positions up with the %s edge', (edge) => {
    expect(overlayPositions(edge)).toStrictEqual([
      expect.objectContaining({ originX: edge, overlayX: edge }),
      expect.objectContaining({ originX: edge, overlayX: edge }),
    ]);
  });
});
