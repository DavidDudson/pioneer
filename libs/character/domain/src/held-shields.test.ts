import { describe, expect, test } from 'bun:test';

import type { ModifierInputs } from '@pioneer/rules/engine';
import { resolveGrants } from '@pioneer/rules/grants';
import { entry, idOf, lookupOf } from '@pioneer/rules/grants/testing';
import { FundamentalRune, Hardness, HitPoints, Level, SpellRank } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { ActiveEffectSchema, EffectInstanceId, effectRoots } from './effects';
import { rulesOf } from './entry-rules';
import { heldShields } from './held-shields';
import type { HeldShield } from './held-shields';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { eraseRune, etchRune } from './rune-edits';
import { fundamental, fundamentalRef, ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

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

  test('a reinforcing rune raises its Hardness, Hit Points and Broken Threshold by its grade, and erasing it moves them back', () => {
    const held = carrying(ItemFixture.SteelShield, { state: CarryState.Held, hands: ONE_HAND });
    const reinforced = etchRune(held, ID, fundamental(FundamentalRune.Reinforcing, 4));
    const [shield] = heldShields(reinforced, content);
    expect(shield).toMatchObject({
      hardness: Hardness.parse(10),
      hitPoints: HitPoints.parse(100),
      brokenThreshold: HitPoints.parse(50),
    });

    const erased = eraseRune(reinforced, ID, fundamentalRef(FundamentalRune.Reinforcing));
    expect(heldShields(erased, content)).toStrictEqual(heldShields(held, content));
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
const SHIELD_SPELL = entry('shield-spell', [
  { key: 'GrantShield', hardness: 5, endsOnBlock: true, raised: true, brackets: [{ start: 3, hardness: 10 }] },
]);

/** The rules of the effect `name` that is on, cast at `rank`, as `heldShields` reads them. */
function rulesOfEffect(name: string, rank?: number): ModifierInputs {
  const effect = ActiveEffectSchema.parse({
    id: EffectInstanceId.parse('00000000-0000-4000-8000-000000000001'),
    effect: idOf(name),
    ...(rank === undefined ? {} : { rank: SpellRank.parse(rank) }),
  });
  const resolution = resolveGrants({
    roots: effectRoots([effect]),
    lookup: lookupOf([AVATAR, SHIELD_SPELL]),
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
const avatarRules = (): ModifierInputs => rulesOfEffect('avatar');

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

const held = (rank: number): readonly HeldShield[] =>
  heldShields(EMPTY_INVENTORY, content, () => rulesOfEffect('shield-spell', rank));

describe('heldShields with a shield an effect gives', () => {
  test('the shield is heightened to the rank of the spell and names the effect that ends with it', () => {
    const [shield] = held(3);

    expect(shield).toMatchObject({
      hardness: Hardness.parse(10),
      undamageable: true,
      granted: {
        effect: idOf('shield-spell'),
        endsOnBlock: true,
        endsWhenDestroyed: false,
        raised: true,
        layered: false,
        recreatedOnSustain: false,
      },
    });
  });

  test('it is the base shield at the lowest rank', () => {
    expect(held(1)[0]?.hardness).toBe(Hardness.parse(5));
  });
});
