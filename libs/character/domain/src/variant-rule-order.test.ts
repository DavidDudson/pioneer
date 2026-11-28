import { describe, expect, test } from 'bun:test';

import type { VariantRuleEntry } from '@pioneer/rules/sdk';
import { ContentLicense, ContentPack, ContentRegistry, OriginHopKind } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedRulesWithVariants } from './character-statistics';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import { slotContent } from './slot-offer';
import { CharacterBuilder, ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './testing';

installRulesFakes();

const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const BOOK = { kind: 'book', book: 'gm-core', page: 1 } as const;

/** A registry whose one variant rule holds an item alteration, as Automatic Bonus Progression does. */
const variants = ((): ReadonlyArray<VariantRuleEntry> => {
  const registry = new ContentRegistry();

  registry.register(
    ContentPack.define({
      manifest: { id: 'variants', title: 'Variants', publisher: 'Pioneer', license: ContentLicense.Homebrew },
      ancestries: [],
      creatures: [],
      variantRules: [
        {
          slug: 'variant-rule:no-potency',
          name: 'No potency',
          sources: [BOOK],
          rules: [
            { key: 'ItemAlteration', items: ['item:type:weapon'], property: 'potency', mode: 'override', value: 0 },
          ],
        },
      ],
    }),
  );

  return registry.variantRules();
})();

/** The origin hop kinds of the rules in play for a held, blade, with the variant in force. */
function hopsInPlay(): ReadonlyArray<OriginHopKind | undefined> {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.HuntersBlade),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  inventory = carryItem(inventory, SWORD, { state: CarryState.Held, hands: ONE_HAND });

  const document = { ...new CharacterBuilder().build().document, inventory };
  const slots = slotContent(itemFixtureRegistry());
  const { rules } = equippedRulesWithVariants(document, itemFixtureContent(), { slots, variants });

  return rules.map(({ origin }) => origin.hops.find((hop) => hop.kind === OriginHopKind.Variant)?.kind);
}

describe('the variant rules in play beside an item', () => {
  test('come after the rules of its runes, so a variant alteration has the last word', () => {
    const hops = hopsInPlay();
    const first = hops.indexOf(OriginHopKind.Variant);

    expect(first).toBeGreaterThan(0);
    expect(hops.slice(first).every((kind) => kind === OriginHopKind.Variant)).toBe(true);
  });
});
