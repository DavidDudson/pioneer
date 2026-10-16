import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants } from './class-build';
import { characterFocus } from './focus-spells';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { spellContent } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder } from './testing';

/**
 * A druid as the importer gives one (ADR-0050), shrunk to three orders: each order's focus entry and order spell unless
 * Order Explorer joined it, Order Explorer's choice of an order the druid hasn't, and Order Magic's of one it joined.
 */
const pack = new ContentPackBuilder().withId('orders');
const ORDERS: readonly (readonly [string, string])[] = [
  ['leaf-order', 'cornucopia'],
  ['storm-order', 'tempest-surge'],
  ['untamed-order', 'untamed-shift'],
];
for (const [, spell] of ORDERS) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['druid', 'focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const orderId = (name: string): string => pack.idOf(ContentKind.ClassFeature, name);

const FOCUS = {
  key: 'SpellcastingEntry',
  slug: 'druid-focus',
  tradition: 'primal',
  attribute: 'wis',
  preparation: 'focus',
};
const explored = (order: string): readonly unknown[] => [{ not: `feat:order-explorer:${order}` }];

for (const [order, spell] of ORDERS) {
  pack.withClassFeature(order, {
    tags: ['druid-order'],
    rules: [
      { ...FOCUS, predicate: explored(order) },
      { key: 'FocusSpells', entry: 'druid-focus', spells: [spellId(spell)], predicate: explored(order) },
    ],
  });
}
pack
  .withClassFeature('druidic-order', {
    rules: [
      { key: 'ChoiceSet', flag: 'druidic-order', choices: { kind: 'class-feature', filter: ['item:tag:druid-order'] } },
      { key: 'GrantItem', item: { choice: 'druidic-order' } },
    ],
  })
  .withFeat('order-explorer', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'order',
        rollOption: 'feat:order-explorer',
        choices: ORDERS.map(([order]) => ({
          value: orderId(order),
          label: order,
          predicate: [{ or: [{ not: `feature:${order}` }, `feat:order-explorer:${order}`] }],
        })),
      },
      { key: 'GrantItem', item: { choice: 'order' } },
    ],
  })
  .withFeat('order-magic', {
    rules: [
      FOCUS,
      {
        key: 'ChoiceSet',
        flag: 'order-magic',
        rollOption: 'order-magic',
        choices: ORDERS.map(([order]) => ({ value: order, label: order, predicate: [`feat:order-explorer:${order}`] })),
      },
      ...ORDERS.map(([order, spell]) => ({
        key: 'FocusSpells',
        entry: 'druid-focus',
        spells: [spellId(spell)],
        predicate: [`order-magic:${order}`],
      })),
    ],
  });
const DRUIDIC_ORDER = orderId('druidic-order');
const EXPLORER = pack.idOf(ContentKind.Feat, 'order-explorer');
const MAGIC = pack.idOf(ContentKind.Feat, 'order-magic');
pack.withClass('druid', ['wis'], {
  rules: [DRUIDIC_ORDER, EXPLORER, MAGIC].map((item) => ({ key: 'GrantItem', item })),
});
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const OWN_SLOT = `${DRUIDIC_ORDER}:0`;
const EXPLORER_SLOT = `${EXPLORER}:0`;
const MAGIC_SLOT = `${MAGIC}:1`;

/** A druid of the leaf order, with `picks` besides: slot key to pick. */
function druid(picks: Readonly<Record<string, string>> = {}): CharacterBuilder {
  let builder = new CharacterBuilder()
    .atLevel(4)
    .picking('class', pack.idOf(ContentKind.Class, 'druid'))
    .picking(OWN_SLOT, orderId('leaf-order'));
  for (const [slot, pick] of Object.entries(picks)) {
    builder = builder.picking(slot, pick);
  }
  return builder;
}

function spellsOf(builder: CharacterBuilder): string[] {
  const { document } = builder.build();
  const entries = characterSpellcasting(characterGrants(document, content));
  const focus = characterFocus(entries, spellContent(registry), document.level);
  return focus.entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe('a druid with Order Explorer and Order Magic', () => {
  test("Order Explorer offers every order but the druid's own", () => {
    const { document } = druid().build();
    const slot = characterGrants(document, content).open.find((each) => String(each.key) === EXPLORER_SLOT);

    expect(slot?.options.map((option) => String(option.value))).toEqual([
      orderId('storm-order'),
      orderId('untamed-order'),
    ]);
  });

  test("an order joined through it grants none of the order's benefits, its order spell included", () => {
    const joined = druid({ [EXPLORER_SLOT]: orderId('storm-order') });

    expect(spellsOf(druid())).toEqual([spellId('cornucopia')]);
    expect(spellsOf(joined)).toEqual([spellId('cornucopia')]);
  });

  test('Order Magic offers only the orders Order Explorer joined', () => {
    const { document } = druid({ [EXPLORER_SLOT]: orderId('storm-order') }).build();
    const slot = characterGrants(document, content).open.find((each) => String(each.key) === MAGIC_SLOT);

    expect(slot?.options.map((option) => String(option.value))).toEqual(['storm-order']);
  });

  test("Order Magic grants the joined order's order spell", () => {
    const picks = { [EXPLORER_SLOT]: orderId('storm-order'), [MAGIC_SLOT]: 'storm-order' };

    expect(spellsOf(druid(picks))).toEqual([spellId('cornucopia'), spellId('tempest-surge')]);
  });

  test('Order Magic offers nothing until Order Explorer joins an order', () => {
    const { document } = druid().build();
    const slot = characterGrants(document, content).open.find((each) => String(each.key) === MAGIC_SLOT);

    expect(slot?.options).toHaveLength(0);
  });
});
