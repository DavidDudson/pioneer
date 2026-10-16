import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { characterGrants } from './class-build';
import { characterFocus } from './focus-spells';
import type { CharacterFocus } from './focus-spells';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { spellContent } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder } from './testing';

/**
 * A fighter with the druid, wizard and bard archetypes as the importer gives them (ADR-0050), shrunk to two orders and
 * two schools: a dedication's pick of an order or school, and the feat that teaches its focus spell.
 */
const pack = new ContentPackBuilder().withId('archetypes');
const ORDERS: readonly (readonly [string, string])[] = [
  ['leaf-order', 'cornucopia'],
  ['storm-order', 'tempest-surge'],
];
const SCHOOLS: readonly (readonly [string, string])[] = [
  ['school-of-battle-magic', 'force-bolt'],
  ['school-of-mentalism', 'charming-push'],
];
for (const [, spell] of [...ORDERS, ...SCHOOLS, ['', 'counter-performance'] as const]) {
  pack.withSpell(spell, { rank: 1, traditions: [], traits: ['focus'] });
}
const spellId = (name: string): string => pack.idOf(ContentKind.Spell, name);
const featureId = (name: string): string => pack.idOf(ContentKind.ClassFeature, name);

const entry = (slug: string, tradition: string, attribute: string): object => ({
  key: 'SpellcastingEntry',
  slug,
  tradition,
  attribute,
  preparation: 'focus',
});
const DRUID_FOCUS = entry('druid-focus', 'primal', 'wis');
const unlessDedication = (order: string): readonly unknown[] => [{ not: `feat:druid-dedication:${order}` }];

for (const [order, spell] of ORDERS) {
  pack.withClassFeature(order, {
    rules: [
      { ...DRUID_FOCUS, predicate: unlessDedication(order) },
      { key: 'FocusSpells', entry: 'druid-focus', spells: [spellId(spell)], predicate: unlessDedication(order) },
    ],
  });
}
pack
  .withFeat('druid-dedication', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'order',
        rollOption: 'feat:druid-dedication',
        choices: ORDERS.map(([order]) => ({ value: featureId(order), label: order })),
      },
      { key: 'GrantItem', item: { choice: 'order' } },
    ],
  })
  .withFeat('order-spell', {
    rules: [
      DRUID_FOCUS,
      ...ORDERS.map(([order, spell]) => ({
        key: 'FocusSpells',
        entry: 'druid-focus',
        spells: [spellId(spell)],
        predicate: [`feat:druid-dedication:${order}`],
      })),
    ],
  })
  .withFeat('wizard-dedication', {
    rules: [
      {
        key: 'ChoiceSet',
        flag: 'school',
        rollOption: 'feat:wizard-dedication',
        choices: SCHOOLS.map(([school]) => ({ value: school, label: school })),
      },
    ],
  })
  .withFeat('arcane-school-spell', {
    rules: [
      entry('wizard-focus', 'arcane', 'int'),
      ...SCHOOLS.map(([school, spell]) => ({
        key: 'FocusSpells',
        entry: 'wizard-focus',
        spells: [spellId(spell)],
        predicate: [`feat:wizard-dedication:${school}`],
      })),
    ],
  })
  .withFeat('counter-perform', {
    rules: [
      entry('bard-focus', 'occult', 'cha'),
      { key: 'FocusSpells', entry: 'bard-focus', spells: [spellId('counter-performance')] },
    ],
  });
const DRUID_DEDICATION = pack.idOf(ContentKind.Feat, 'druid-dedication');
const ORDER_SPELL = pack.idOf(ContentKind.Feat, 'order-spell');
const WIZARD_DEDICATION = pack.idOf(ContentKind.Feat, 'wizard-dedication');
const ARCANE_SCHOOL_SPELL = pack.idOf(ContentKind.Feat, 'arcane-school-spell');
const COUNTER_PERFORM = pack.idOf(ContentKind.Feat, 'counter-perform');
const DEDICATIONS = [DRUID_DEDICATION, WIZARD_DEDICATION];
const FEATS = new Map([
  ['plain', []],
  ['order-spell', [ORDER_SPELL]],
  ['school-spell', [ARCANE_SCHOOL_SPELL]],
  ['counter-perform', [COUNTER_PERFORM]],
  ['all', [ORDER_SPELL, ARCANE_SCHOOL_SPELL, COUNTER_PERFORM]],
]);
for (const [name, feats] of FEATS) {
  pack.withClass(name, ['str'], {
    rules: [...DEDICATIONS, ...feats].map((item) => ({ key: 'GrantItem', item })),
  });
}
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const ORDER_PICK = `${DRUID_DEDICATION}:0`;
const SCHOOL_PICK = `${WIZARD_DEDICATION}:0`;

/** A character of the class granting the archetype feats named `feats`, with `picks` besides: slot key to pick. */
function character(feats: string, picks: Readonly<Record<string, string>> = {}): CharacterBuilder {
  let builder = new CharacterBuilder().atLevel(4).picking('class', pack.idOf(ContentKind.Class, feats));
  for (const [slot, pick] of Object.entries(picks)) {
    builder = builder.picking(slot, pick);
  }
  return builder;
}

function focusOf(builder: CharacterBuilder): CharacterFocus {
  const { document } = builder.build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

function spellsOf(builder: CharacterBuilder): string[] {
  return focusOf(builder).entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)));
}

describe('a character with archetype focus spells', () => {
  test("Druid Dedication's order grants no order spell, Order Spell grants it", () => {
    const picks = { [ORDER_PICK]: featureId('storm-order') };

    expect(spellsOf(character('plain', picks))).toEqual([]);
    expect(spellsOf(character('order-spell', picks))).toEqual([spellId('tempest-surge')]);
  });

  test("Arcane School Spell grants the initial spell of the dedication's school", () => {
    const picks = { [SCHOOL_PICK]: 'school-of-mentalism' };

    expect(spellsOf(character('plain', picks))).toEqual([]);
    expect(spellsOf(character('school-spell', picks))).toEqual([spellId('charming-push')]);
  });

  test('Counter Perform grants Counter Performance', () => {
    expect(spellsOf(character('counter-perform'))).toEqual([spellId('counter-performance')]);
  });

  test('the three feats add to one focus pool', () => {
    const all = character('all', {
      [ORDER_PICK]: featureId('leaf-order'),
      [SCHOOL_PICK]: 'school-of-battle-magic',
    });

    expect(spellsOf(all)).toHaveLength(3);
    expect(focusOf(all).pool).toBe(3);
  });
});
