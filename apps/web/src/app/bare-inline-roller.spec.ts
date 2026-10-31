import { TestBed } from '@angular/core/testing';
import { RANDOM_SOURCE, RollPresenter } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { DamageFormula, DamageType, Dc, InlineKind, Selector } from '@pioneer/rules/sdk';
import type { DamageNode } from '@pioneer/rules/sdk';
import { INLINE_ROLLER } from '@pioneer/rules/ui';
import type { InlineRoller } from '@pioneer/rules/ui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { provideBareInlineRoller } from './bare-inline-roller';

const check = { type: InlineKind.Check, statistic: Selector.parse('save:reflex'), dc: Dc.parse(20) } as const;

function damageOf(formula: string): DamageNode {
  return {
    type: InlineKind.Damage,
    instances: [{ formula: DamageFormula.parse(formula), damageType: DamageType.Fire }],
  };
}

/** The roller, with the dice landing on `faces` in order. */
function rollerWith(...faces: readonly number[]): InlineRoller {
  TestBed.configureTestingModule({
    providers: [
      provideBareInlineRoller(),
      { provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) },
    ],
  });
  return TestBed.inject(INLINE_ROLLER);
}

describe('the roller for text read with no character', () => {
  beforeEach(() => {
    // Without motion the toast shows at once.
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: true, media: query }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rolls any check as a bare d20, named by its text', () => {
    const roller = rollerWith(13);
    expect(roller.hasStatistic(Selector.parse('skill:lore:anything'))).toBe(true);
    roller.check({ node: check, label: 'DC 20 Reflex save' });
    const toast = TestBed.inject(RollPresenter).toast();
    expect(toast?.label).toBe('DC 20 Reflex save');
    expect(toast?.total).toBe(13);
  });

  it('rolls damage in its type', () => {
    const roller = rollerWith(4, 5);
    roller.damage({ node: damageOf('2d6'), label: '2d6 fire' });
    const lines = TestBed.inject(RollPresenter).toast()?.lines;
    expect(lines).toStrictEqual([expect.objectContaining({ total: 9, typeKey: 'roll.damageType.fire' })]);
  });

  it('rolls nothing for a formula that reads a character', () => {
    const roller = rollerWith(4);
    roller.damage({ node: damageOf('1d8 + @attr.str'), label: '1d8 + Strength fire' });
    expect(TestBed.inject(RollPresenter).toast()).toBeUndefined();
  });
});
