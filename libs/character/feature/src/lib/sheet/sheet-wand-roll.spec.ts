import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { describe, expect, it } from 'vitest';

import { rollFlatCheck } from './sheet-wand-roll';

describe(rollFlatCheck, () => {
  it('returns the d20 face and the roll the stage plays, both from the same throw', () => {
    const flat = rollFlatCheck(scriptedRandom([DieFace.parse(7)]));
    expect(flat.natural).toBe(7);
    expect(flat.result.total).toBe(7);
    expect(flat.result.terms).toHaveLength(1);
  });
});
