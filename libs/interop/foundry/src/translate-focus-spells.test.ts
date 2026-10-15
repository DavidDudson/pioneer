import { describe, expect, test } from 'bun:test';

import { DeityDomain, RuleElement, RuleElementKey } from '@pioneer/rules/sdk';

import { DOMAIN_SPELLS } from './domain-spells';
import { rulesIn } from './testing/build-helpers';
import { idOf, translate } from './testing/import-fixtures';
import type { DocumentFixture } from './testing/import-fixtures';
import {
  ADVANCED_DOMAIN,
  CACKLE,
  COMPOSITION_SPELLS,
  DOMAIN_INITIATE,
  HEX_SPELLS,
  INITIATE_WARDEN,
  LESSON_OF_LIFE,
  ORDER_EXPLORER,
  ORDER_MAGIC,
  SCHOOL_OF_BATTLE_MAGIC,
  THE_RESENTMENT,
  UNTAMED_ORDER,
  WIZARD_SPELLCASTING,
} from './testing/spellcasting-fixtures';

const { ChoiceSet, FocusSpells, SpellcastingEntry } = RuleElementKey;

/** The values a `ChoiceSet` offers. */
function valuesOf(choice: Record<string, unknown> | undefined): string[] {
  const choices = Array.isArray(choice?.['choices']) ? (choice['choices'] as { value: string }[]) : [];
  return choices.map(({ value }) => value);
}

function keyed(key: string, name: string, fixture: DocumentFixture): Record<string, unknown>[] {
  return rulesIn(translate([fixture]), name).filter(
    (rule): rule is Record<string, unknown> =>
      typeof rule === 'object' && rule !== null && 'key' in rule && rule.key === key,
  );
}

const spell = (slug: string): string => idOf(`spell:${slug}`);

/** The domains Player Core prints an advanced domain spell for. */
const WITH_ADVANCED = [...DOMAIN_SPELLS].filter(([, [, advanced]]) => advanced !== undefined).map(([domain]) => domain);

describe('translateKindData: focus spells', () => {
  test('Composition Spells makes the bard a focus caster with Counter Performance and Courageous Anthem', () => {
    expect(keyed(SpellcastingEntry, 'composition-spells', COMPOSITION_SPELLS)).toEqual([
      { key: SpellcastingEntry, slug: 'bard-focus', tradition: 'occult', attribute: 'cha', preparation: 'focus' },
    ]);
    expect(keyed(FocusSpells, 'composition-spells', COMPOSITION_SPELLS)).toEqual([
      {
        key: FocusSpells,
        entry: 'bard-focus',
        spells: [spell('counter-performance'), spell('courageous-anthem')],
      },
    ]);
  });

  test("Domain Initiate picks one of the deity's domains, primary or alternate, for its initial domain spell", () => {
    const [choice] = keyed(ChoiceSet, 'domain-initiate', DOMAIN_INITIATE);
    expect(choice).toMatchObject({ flag: 'domain-initiate', rollOption: 'domain-initiate' });
    expect(choice?.['choices']).toContainEqual({
      value: 'fire',
      label: 'Fire',
      predicate: [{ or: ['deity:primary:domain:fire', 'deity:primary:alternate-domain:fire'] }],
    });
    expect(keyed(FocusSpells, 'domain-initiate', DOMAIN_INITIATE)).toContainEqual({
      key: FocusSpells,
      entry: 'cleric-focus',
      spells: [spell('fire-ray')],
      predicate: ['domain-initiate:fire'],
    });
  });

  test("every domain it offers is one of Foundry's domains, each once, and Foundry's own choice is dropped", () => {
    const choices = keyed(ChoiceSet, 'domain-initiate', DOMAIN_INITIATE);
    expect(choices).toHaveLength(1);
    const values = valuesOf(choices[0]);
    const domains: readonly string[] = Object.values(DeityDomain);
    expect(values.filter((value) => !domains.includes(value))).toEqual([]);
    expect(new Set(values).size).toBe(values.length);
  });

  test('Advanced Domain offers the advanced spell of a domain Domain Initiate picked', () => {
    const [choice] = keyed(ChoiceSet, 'advanced-domain', ADVANCED_DOMAIN);
    expect(choice?.['choices']).toContainEqual({ value: 'fire', label: 'Fire', predicate: ['domain-initiate:fire'] });
    expect(keyed(FocusSpells, 'advanced-domain', ADVANCED_DOMAIN)).toContainEqual({
      key: FocusSpells,
      entry: 'cleric-focus',
      spells: [spell('flame-barrier')],
      predicate: ['advanced-domain:fire'],
    });
  });

  test('Initiate Warden makes the ranger a focus caster and picks one initial warden spell', () => {
    expect(keyed(SpellcastingEntry, 'initiate-warden', INITIATE_WARDEN)).toEqual([
      { key: SpellcastingEntry, slug: 'ranger-focus', tradition: 'primal', attribute: 'wis', preparation: 'focus' },
    ]);
    const [choice] = keyed(ChoiceSet, 'initiate-warden', INITIATE_WARDEN);
    expect(valuesOf(choice)).toEqual(['gravity-weapon', 'heal-companion', 'magic-hide']);
  });

  test('a school gives its initial school spell, and its advanced one with Advanced School Spell', () => {
    expect(keyed(FocusSpells, 'school-of-battle-magic', SCHOOL_OF_BATTLE_MAGIC)).toEqual([
      { key: FocusSpells, entry: 'wizard-focus', spells: [spell('force-bolt')] },
      {
        key: FocusSpells,
        entry: 'wizard-focus',
        spells: [spell('energy-absorption')],
        predicate: ['feat:advanced-school-spell'],
      },
    ]);
  });

  test('every element it adds is a valid rule element, and a feature with none gets none', () => {
    for (const [name, fixture] of [
      ['composition-spells', COMPOSITION_SPELLS],
      ['domain-initiate', DOMAIN_INITIATE],
      ['advanced-domain', ADVANCED_DOMAIN],
      ['initiate-warden', INITIATE_WARDEN],
    ] as const) {
      for (const rule of rulesIn(translate([fixture]), name)) {
        expect(RuleElement.safeParse(rule).success).toBe(true);
      }
    }
    expect(keyed(FocusSpells, 'wizard-spellcasting', WIZARD_SPELLCASTING)).toEqual([]);
  });

  test('Domain Initiate offers every domain, and a focus spells element per domain, gated on it', () => {
    const domains = [...DOMAIN_SPELLS.keys()];
    const predicates = keyed(FocusSpells, 'domain-initiate', DOMAIN_INITIATE).map(({ predicate }) => predicate);

    expect(valuesOf(keyed(ChoiceSet, 'domain-initiate', DOMAIN_INITIATE)[0])).toEqual(domains);
    expect(predicates).toEqual(domains.map((domain) => [`domain-initiate:${domain}`]));
  });

  test('Advanced Domain offers only the domains Player Core prints an advanced spell for', () => {
    const offered = valuesOf(keyed(ChoiceSet, 'advanced-domain', ADVANCED_DOMAIN)[0]);

    expect(offered).toEqual(WITH_ADVANCED);
    expect(offered).not.toContain('sun');
    expect(keyed(FocusSpells, 'advanced-domain', ADVANCED_DOMAIN)).toHaveLength(offered.length);
  });

  test("Initiate Warden gives the picked warden spell while it's picked", () => {
    expect(keyed(FocusSpells, 'initiate-warden', INITIATE_WARDEN)).toEqual(
      ['gravity-weapon', 'heal-companion', 'magic-hide'].map((name) => ({
        key: FocusSpells,
        entry: 'ranger-focus',
        spells: [spell(name)],
        predicate: [`initiate-warden:${name}`],
      })),
    );
  });

  test("a druid's order gives its order spell, unless joined through Order Explorer", () => {
    const predicate = [{ not: 'feat:order-explorer:untamed-order' }];

    expect(keyed(SpellcastingEntry, 'untamed-order', UNTAMED_ORDER)).toEqual([
      {
        key: SpellcastingEntry,
        slug: 'druid-focus',
        tradition: 'primal',
        attribute: 'wis',
        preparation: 'focus',
        predicate,
      },
    ]);
    expect(keyed(FocusSpells, 'untamed-order', UNTAMED_ORDER)).toEqual([
      { key: FocusSpells, entry: 'druid-focus', spells: [spell('untamed-shift')], predicate },
    ]);
  });

  test("Order Explorer offers the druidic orders the druid doesn't have, or joined through it, and grants the pick", () => {
    const [choice] = keyed(ChoiceSet, 'order-explorer', ORDER_EXPLORER);
    const orders = ['animal', 'leaf', 'storm', 'untamed'].map((name) => `${name}-order`);

    expect(choice).toMatchObject({ flag: 'order', rollOption: 'feat:order-explorer' });
    expect(valuesOf(choice)).toEqual(orders.map((order) => idOf(`class-feature:${order}`)));
    expect(choice?.['choices']).toContainEqual({
      value: idOf('class-feature:leaf-order'),
      label: 'Leaf Order',
      predicate: [{ or: [{ not: 'feature:leaf-order' }, 'feat:order-explorer:leaf-order'] }],
    });
    expect(keyed(RuleElementKey.GrantItem, 'order-explorer', ORDER_EXPLORER)).toEqual([
      { key: RuleElementKey.GrantItem, item: { choice: 'order' } },
    ]);
  });

  test("Order Magic gives the order spell of an order Order Explorer joined, in the druid's focus entry", () => {
    const [choice] = keyed(ChoiceSet, 'order-magic', ORDER_MAGIC);

    expect(choice).toMatchObject({ flag: 'order-magic', rollOption: 'order-magic' });
    expect(choice?.['choices']).toContainEqual({
      value: 'storm-order',
      label: 'Storm Order',
      predicate: ['feat:order-explorer:storm-order'],
    });
    expect(keyed(SpellcastingEntry, 'order-magic', ORDER_MAGIC)).toEqual([
      { key: SpellcastingEntry, slug: 'druid-focus', tradition: 'primal', attribute: 'wis', preparation: 'focus' },
    ]);
    expect(keyed(FocusSpells, 'order-magic', ORDER_MAGIC)).toContainEqual({
      key: FocusSpells,
      entry: 'druid-focus',
      spells: [spell('tempest-surge')],
      predicate: ['order-magic:storm-order'],
    });
  });

  test("a witch's patron gives a focus entry in its tradition and its hex cantrip", () => {
    expect(keyed(SpellcastingEntry, 'the-resentment', THE_RESENTMENT)).toContainEqual({
      key: SpellcastingEntry,
      slug: 'witch-focus',
      tradition: 'occult',
      attribute: 'int',
      preparation: 'focus',
    });
    expect(keyed(FocusSpells, 'the-resentment', THE_RESENTMENT)).toEqual([
      { key: FocusSpells, entry: 'witch-focus', spells: [spell('evil-eye')] },
    ]);
  });

  test('Hex Spells picks one of two hexes; a lesson and Cackle each teach theirs', () => {
    expect(valuesOf(keyed(ChoiceSet, 'hex-spells', HEX_SPELLS)[0])).toEqual(['patrons-puppet', 'phase-familiar']);
    expect(keyed(FocusSpells, 'hex-spells', HEX_SPELLS).map(({ predicate }) => predicate)).toEqual([
      ['hex-spells:patrons-puppet'],
      ['hex-spells:phase-familiar'],
    ]);
    expect(keyed(FocusSpells, 'lesson-of-life', LESSON_OF_LIFE)).toEqual([
      { key: FocusSpells, entry: 'witch-focus', spells: [spell('life-boost')] },
    ]);
    expect(keyed(FocusSpells, 'cackle', CACKLE)).toEqual([
      { key: FocusSpells, entry: 'witch-focus', spells: [spell('cackle')] },
    ]);
  });
});
