import { Dying } from '@pioneer/character/domain';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { describe, expect, it } from 'vitest';

import { rollRecoveryCheck } from './recovery-check';

describe(rollRecoveryCheck, () => {
  it('hands back the roll that counted, so the stage plays the same d20 the card explains', () => {
    const recovery = rollRecoveryCheck(Dying.parse(1), scriptedRandom([DieFace.parse(12)]), 1);
    expect(recovery.result.total).toBe(12);
    expect(recovery.result.terms).toHaveLength(1);
  });
});
