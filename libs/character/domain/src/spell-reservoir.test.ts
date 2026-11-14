import { describe, expect, test } from 'bun:test';

import { FundamentalRune, RuneType, SpellRank } from '@pioneer/rules/sdk';
import type { CastActions } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { itemContent } from './inventory-content';
import { setItemState } from './inventory-state';
import { runeContent } from './item-runes';
import { etchRune } from './rune-edits';
import { spellContent } from './spell-content';
import type { SpellContent } from './spell-content';
import { RESERVOIR_RANK_MAX, ReservoirProblem, reservoirRefusal } from './spell-reservoir';
import {
  fundamental,
  ItemFixture,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
  spellFixtureId,
  spellFixtures,
} from './testing';

installRulesFakes();
const registry = itemFixtureRegistry();
registry.register(spellFixtures());
const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const spells = spellContent(registry);
const reads = { items: itemContent(registry), runes: runeContent(registry), spells };
const FIREBALL = spellFixtureId('fireball');
const HEAL = spellFixtureId('heal');
const WISH = spellFixtureId('wish');

/** A +1 longsword, with a spell reservoir rune when `reserved`, holding the stored spell when `held`. */
function sword(reserved: boolean, held = false): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, 1));
  if (reserved) {
    inventory = etchRune(inventory, SWORD, {
      type: RuneType.Property,
      rune: runeFixtureId(RuneFixture.SpellReservoir),
    });
  }
  if (held) {
    inventory = setItemState(inventory, SWORD, { spell: { spell: HEAL, rank: SpellRank.parse(1) } });
  }
  const [line] = inventory.items;
  if (line === undefined) {
    throw new Error('the sword was not added');
  }
  return line;
}

/** The registry's spells, with `id` taking `cast` to cast. */
function castingAs(id: typeof FIREBALL, cast: readonly CastActions[]): SpellContent {
  const option = spells.anySpell(id);
  return {
    ...spells,
    anySpell: (each) => (each === id && option !== undefined ? { ...option, cast } : spells.anySpell(each)),
  };
}

describe('spell reservoir rune', () => {
  test('takes a spell of 3rd rank or lower that casts in two actions', () => {
    expect(reservoirRefusal(sword(true), FIREBALL, reads)).toBeUndefined();
    expect(reservoirRefusal(sword(true), HEAL, reads)).toBeUndefined();
  });

  test('refuses a weapon with no reservoir rune', () => {
    expect(reservoirRefusal(sword(false), FIREBALL, reads)).toBe(ReservoirProblem.NoRune);
  });

  test('refuses a spell above 3rd rank', () => {
    expect(RESERVOIR_RANK_MAX).toBe(SpellRank.parse(3));
    expect(reservoirRefusal(sword(true), WISH, reads)).toBe(ReservoirProblem.RankTooHigh);
  });

  test('refuses a spell that takes three actions or minutes to cast', () => {
    expect(reservoirRefusal(sword(true), FIREBALL, { ...reads, spells: castingAs(FIREBALL, ['three']) })).toBe(
      ReservoirProblem.TooLongToCast,
    );
    expect(reservoirRefusal(sword(true), FIREBALL, { ...reads, spells: castingAs(FIREBALL, ['time']) })).toBe(
      ReservoirProblem.TooLongToCast,
    );
  });

  test('takes a one-action or reaction spell', () => {
    expect(reservoirRefusal(sword(true), FIREBALL, { ...reads, spells: castingAs(FIREBALL, ['one']) })).toBeUndefined();
    expect(
      reservoirRefusal(sword(true), FIREBALL, { ...reads, spells: castingAs(FIREBALL, ['reaction']) }),
    ).toBeUndefined();
  });

  test('refuses a spell the content does not hold', () => {
    expect(reservoirRefusal(sword(true), itemFixtureId(ItemFixture.Longsword), reads)).toBe(
      ReservoirProblem.UnknownSpell,
    );
  });

  test('holds one spell until it is expended', () => {
    expect(reservoirRefusal(sword(true, true), FIREBALL, reads)).toBe(ReservoirProblem.Occupied);
  });

  test('a line whose spell is expended keeps no state', () => {
    const inventory = setItemState(
      addItem(EMPTY_INVENTORY, { id: SWORD, item: FIREBALL, quantity: ItemQuantity.parse(1), container: undefined }),
      SWORD,
      {},
    );
    expect(inventory.items[0]?.state).toBeUndefined();
  });
});
