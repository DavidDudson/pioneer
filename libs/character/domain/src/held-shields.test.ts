import { describe, expect, test } from 'bun:test';

import type { ModifierInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { Hardness, HitPoints, Level } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { ActiveEffectSchema, EffectInstanceId, effectRoots } from './effects';
import { rulesOf } from './entry-rules';
import { heldShields } from './held-shields';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const ID = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** An inventory of one `item`, carried as given. */
function carrying(item: ItemFixture, carry: Carry): Inventory {
  const stock = addItem(EMPTY_INVENTORY, {
    id: ID,
    item: itemFixtureId(item),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  return carryItem(stock, ID, carry);
}

describe('heldShields', () => {
  test('a held shield gives its Hardness, Hit Points and a Broken Threshold of half its Hit Points', () => {
    const held = carrying(ItemFixture.SteelShield, { state: CarryState.Held, hands: ONE_HAND });

    expect(heldShields(held, content)).toStrictEqual([
      {
        entry: itemFixtureId(ItemFixture.SteelShield),
        item: ID,
        hardness: Hardness.parse(5),
        hitPoints: HitPoints.parse(20),
        brokenThreshold: HitPoints.parse(10),
      },
    ]);
  });

  test('a stowed shield gives none', () => {
    expect(heldShields(carrying(ItemFixture.SteelShield, { state: CarryState.Stowed }), content)).toStrictEqual([]);
  });

  test('a held weapon is no shield', () => {
    const held = carrying(ItemFixture.Longsword, { state: CarryState.Held, hands: ONE_HAND });

    expect(heldShields(held, content)).toStrictEqual([]);
  });
});

const AVATAR = entry('avatar', [{ key: 'BattleForm', form: { shield: { hardness: 15 } } }]);

/** The rules of an Avatar effect that is on, as `heldShields` reads them. */
function avatarRules(): ModifierInputs {
  const effect = ActiveEffectSchema.parse({
    id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000001'),
    effect: idOf('avatar'),
  });
  const resolution = resolveGrants({
    roots: effectRoots([effect]),
    lookup: lookupOf([AVATAR]),
    level: Level.parse(10),
    situation: [],
    picks: new Map(),
    toggles: new Map(),
    rootSlots: [],
    namespaces: new Map(),
  });
  const rules = rulesOf(resolution, { inventory: EMPTY_INVENTORY, content: itemFixtureContent() }, () => true);
  return { rules, facts: resolution.facts };
}

describe('heldShields in a battle form with a shield', () => {
  test('the form carries a shield with its Hardness that cannot be damaged, beside the inventory shields', () => {
    const held = carrying(ItemFixture.SteelShield, { state: CarryState.Held, hands: ONE_HAND });
    const shields = heldShields(held, content, avatarRules);

    expect(shields.map(({ hardness, undamageable }) => [hardness, undamageable])).toStrictEqual([
      [Hardness.parse(5), undefined],
      [Hardness.parse(15), true],
    ]);
  });

  test('the shield has the same id every time, and none without the form', () => {
    const [first] = heldShields(EMPTY_INVENTORY, content, avatarRules);
    const [second] = heldShields(EMPTY_INVENTORY, content, avatarRules);

    expect(first?.item).toBe(second?.item);
    expect(heldShields(EMPTY_INVENTORY, content)).toStrictEqual([]);
  });
});
