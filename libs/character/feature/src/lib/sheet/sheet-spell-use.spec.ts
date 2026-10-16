import { slotCountKey, TurnPhase, TurnStateSchema } from '@pioneer/character/domain';
import type { SpellOption } from '@pioneer/character/domain';
import {
  ActionCost,
  AreaValue,
  CastActions,
  ContentId,
  ContentText,
  MagicTradition,
  Rarity,
  Slug,
  SpellRank,
} from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { spellUse } from './sheet-spell-use';
import type { SpellSpend } from './sheet-spell-use';

const GREASE = ContentId.parse('00000000-0000-4000-8000-000000000001');
const SLOT = slotCountKey(Slug.parse('wizard'), undefined, SpellRank.parse(1));

function spell(cast: SpellOption['cast']): SpellOption {
  return {
    id: GREASE,
    name: ContentText.parse('Grease'),
    rank: SpellRank.parse(1),
    traditions: [MagicTradition.Arcane],
    rarity: Rarity.Common,
    cantrip: false,
    focus: false,
    cast,
    range: [],
    area: AreaValue.None,
    targets: [],
    defense: [],
    duration: [],
    traits: [],
    sources: [],
  };
}

function spendWith(actions: number, slots = 1, focusLeft = 0): SpellSpend {
  return {
    turn: TurnStateSchema.parse({ phase: TurnPhase.Turn, actions }),
    slotsLeft: () => slots,
    focusLeft,
  };
}

describe(spellUse, () => {
  it('takes its cost from the content and pays the slot it is given', () => {
    const line = spellUse(spell([CastActions.Two]), { slot: SLOT }, spendWith(3));
    expect(line).toMatchObject({ id: GREASE, cost: ActionCost.Two, payment: { slot: SLOT }, affordable: true });
  });

  it('cannot be cast with too few actions left', () => {
    expect(spellUse(spell([CastActions.Two]), { slot: SLOT }, spendWith(1)).affordable).toBe(false);
  });

  it('cannot be cast with no slot left', () => {
    expect(spellUse(spell([CastActions.Two]), { slot: SLOT }, spendWith(3, 0)).affordable).toBe(false);
  });

  it('pays a Focus Point for a focus spell, and needs one left', () => {
    expect(spellUse(spell([CastActions.Two]), { focus: true }, spendWith(3, 1, 1))).toMatchObject({
      payment: { focus: true },
      affordable: true,
    });
    expect(spellUse(spell([CastActions.Two]), { focus: true }, spendWith(3, 1, 0)).affordable).toBe(false);
  });

  it('pays nothing for a cantrip', () => {
    expect(spellUse(spell([CastActions.One]), {}, spendWith(3, 0)).payment).toBeUndefined();
  });

  it('runs from its fewest actions to its most for a variable cost, capped by the turn', () => {
    const line = spellUse(spell([CastActions.One, CastActions.Two, CastActions.Three]), {}, spendWith(2));
    expect(line).toMatchObject({ cost: ActionCost.One, upTo: 3, affordableUpTo: 2 });
  });
});
