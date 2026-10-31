import { describe, expect, test } from 'bun:test';

import { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { DEITY_SLOT } from './character-slots';
import { characterGrants } from './class-build';
import { characterFocus } from './focus-spells';
import type { CharacterFocus } from './focus-spells';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { spellContent } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';
import { CharacterBuilder } from './testing';

/** A focus entry with `slug`, as a class feature's `SpellcastingEntry` element. */
function focusEntry(slug: string, tradition = 'divine'): object {
  return { key: 'SpellcastingEntry', slug, tradition, attribute: 'wis', preparation: 'focus' };
}

/** A `FocusSpells` element naming `ids` on `entry`, holding while `predicate` does. */
function knows(entry: string, ids: readonly string[], predicate?: readonly string[]): object {
  return { key: 'FocusSpells', entry, spells: ids, ...(predicate === undefined ? {} : { predicate }) };
}

/** What a character's focus spells come to, with `registry`'s content. */
function focusOf(builder: CharacterBuilder, content: SlotContent, registry: ContentRegistry): CharacterFocus {
  const { document } = builder.build();
  const entries = characterSpellcasting(characterGrants(document, content));
  return characterFocus(entries, spellContent(registry), document.level);
}

function contentOf(registry: ContentRegistry): SlotContent {
  return { ...slotContent(registry), namespaces: CORE_NAMESPACES };
}

/**
 * A cleric's domain spells as the importer gives Domain Initiate them (ADR-0050), shrunk to three domains: a focus
 * entry, a choice of the deity's domains, and each domain's initial domain spell while it is picked.
 */
const clerics = new ContentPackBuilder().withId('focus');
const DOMAIN_SPELLS: readonly (readonly [string, string])[] = [
  ['fire', 'fire-ray'],
  ['healing', 'healers-blessing'],
  ['sun', 'dazzling-flash'],
];
for (const [, spell] of DOMAIN_SPELLS) {
  clerics.withSpell(spell, { rank: 1, traditions: [], traits: ['cleric', 'focus'] });
}
const spellId = (name: string): string => clerics.idOf(ContentKind.Spell, name);
const DOMAIN_INITIATE = clerics.idOf(ContentKind.ClassFeature, 'domain-initiate');
clerics
  .withDeity('atreia', { font: ['heal'], domains: { primary: ['fire', 'healing'], alternate: [] } })
  .withDeity('sarenrae', { font: ['heal'], domains: { primary: ['healing'], alternate: ['sun'] } })
  .withClassFeature('domain-initiate', {
    rules: [
      focusEntry('cleric-focus'),
      {
        key: 'ChoiceSet',
        flag: 'domain-initiate',
        rollOption: 'domain-initiate',
        choices: DOMAIN_SPELLS.map(([domain]) => ({
          value: domain,
          label: domain,
          predicate: [{ or: [`deity:primary:domain:${domain}`, `deity:primary:alternate-domain:${domain}`] }],
        })),
      },
      ...DOMAIN_SPELLS.map(([domain, spell]) => knows('cleric-focus', [spellId(spell)], [`domain-initiate:${domain}`])),
    ],
  })
  .withClass('cleric', ['wis'], { rules: [{ key: 'GrantItem', item: DOMAIN_INITIATE }] });
const clericRegistry = new ContentRegistry();
clericRegistry.register(clerics.build());
const clericContent = contentOf(clericRegistry);

const DOMAIN_SLOT = `${DOMAIN_INITIATE}:1`;

function cleric(level: number, deity: string, picked?: string): CharacterBuilder {
  const builder = new CharacterBuilder()
    .atLevel(level)
    .picking('class', clerics.idOf(ContentKind.Class, 'cleric'))
    .picking(String(DEITY_SLOT), clerics.idOf(ContentKind.Deity, deity));
  return picked === undefined ? builder : builder.picking(DOMAIN_SLOT, picked);
}

/** The domains Domain Initiate offers a cleric of `deity`. */
function offered(deity: string): readonly string[] | undefined {
  const { document } = cleric(1, deity).build();
  const slot = characterGrants(document, clericContent).open.find((each) => String(each.key) === DOMAIN_SLOT);
  return slot?.options.map((option) => String(option.value));
}

describe('characterFocus: a cleric with Domain Initiate', () => {
  test("offers the deity's domains, primary and alternate, and no other", () => {
    expect(offered('atreia')).toEqual(['fire', 'healing']);
    expect(offered('sarenrae')).toEqual(['healing', 'sun']);
  });

  test("knows the picked domain's initial domain spell, cast at half the level rounded up, with a pool of 1", () => {
    const focus = focusOf(cleric(7, 'atreia', 'fire'), clericContent, clericRegistry);

    expect(focus.entries.map(({ entry, spells }) => [String(entry.slug), spells.map(({ id }) => String(id))])).toEqual([
      ['cleric-focus', [spellId('fire-ray')]],
    ]);
    expect(Number(focus.rank)).toBe(4);
    expect(Number(focus.pool)).toBe(1);
  });

  test('knows no domain spell, and has no focus pool, until a domain is picked', () => {
    const focus = focusOf(cleric(1, 'atreia'), clericContent, clericRegistry);

    expect(focus.entries.map(({ spells }) => spells)).toEqual([[]]);
    expect(Number(focus.pool)).toBe(0);
  });
});

/**
 * A cleric who takes the Domain Initiate feat in two class feat slots: a repeatable feat (`maxTakable`), so each take
 * has a domain of its own, and the spells add up.
 */
const twice = new ContentPackBuilder().withId('twice');
for (const [, spell] of DOMAIN_SPELLS) {
  twice.withSpell(spell, { rank: 1, traditions: [], traits: ['cleric', 'focus'] });
}
const twiceSpell = (name: string): string => twice.idOf(ContentKind.Spell, name);
const REPEATABLE_INITIATE = twice.idOf(ContentKind.Feat, 'domain-initiate');
const featSlot = (flag: string): object => ({
  key: 'ChoiceSet',
  flag,
  choices: [{ value: REPEATABLE_INITIATE, label: 'Domain Initiate' }],
});
twice
  .withDeity('atreia', { font: ['heal'], domains: { primary: ['fire', 'healing'], alternate: [] } })
  .withFeat('domain-initiate', {
    data: { category: 'class', maxTakable: 'unlimited' },
    rules: [
      focusEntry('cleric-focus'),
      {
        key: 'ChoiceSet',
        flag: 'domain-initiate',
        rollOption: 'domain-initiate',
        choices: DOMAIN_SPELLS.map(([domain]) => ({
          value: domain,
          label: domain,
          predicate: [{ or: [`deity:primary:domain:${domain}`, `deity:primary:alternate-domain:${domain}`] }],
        })),
      },
      ...DOMAIN_SPELLS.map(([domain, spell]) =>
        knows('cleric-focus', [twiceSpell(spell)], [`domain-initiate:${domain}`]),
      ),
    ],
  })
  .withClass('cleric', ['wis'], {
    rules: [
      featSlot('first'),
      { key: 'GrantItem', item: { choice: 'first' } },
      featSlot('second'),
      { key: 'GrantItem', item: { choice: 'second' } },
    ],
  });
const twiceRegistry = new ContentRegistry();
twiceRegistry.register(twice.build());
const twiceContent = contentOf(twiceRegistry);

const TWICE_CLASS = twice.idOf(ContentKind.Class, 'cleric');
const FIRST_FEAT = `${TWICE_CLASS}:0`;
const SECOND_FEAT = `${TWICE_CLASS}:2`;
const FIRST_DOMAIN = `${REPEATABLE_INITIATE}:via-${FIRST_FEAT}:1`;
const SECOND_DOMAIN = `${REPEATABLE_INITIATE}:via-${SECOND_FEAT}:1`;

function twiceCleric(domains: readonly (readonly [string, string])[] = []): CharacterBuilder {
  const builder = new CharacterBuilder()
    .atLevel(4)
    .picking('class', TWICE_CLASS)
    .picking(String(DEITY_SLOT), twice.idOf(ContentKind.Deity, 'atreia'))
    .picking(FIRST_FEAT, REPEATABLE_INITIATE)
    .picking(SECOND_FEAT, REPEATABLE_INITIATE);
  for (const [slot, domain] of domains) {
    builder.picking(slot, domain);
  }
  return builder;
}

describe('characterFocus: a cleric with Domain Initiate taken twice', () => {
  test("offers the second take a domain of its own, without the first take's", () => {
    const { document } = twiceCleric([[FIRST_DOMAIN, 'fire']]).build();
    const open = characterGrants(document, twiceContent).open.find((slot) => String(slot.key) === SECOND_DOMAIN);

    expect(open?.options.map((option) => String(option.value))).toEqual(['healing']);
  });

  test("knows the spell of each take's domain, and the pool counts both", () => {
    const builder = twiceCleric([
      [FIRST_DOMAIN, 'fire'],
      [SECOND_DOMAIN, 'healing'],
    ]);
    const focus = focusOf(builder, twiceContent, twiceRegistry);

    expect(focus.entries.map(({ entry, spells }) => [String(entry.slug), spells.map(({ id }) => String(id))])).toEqual([
      ['cleric-focus', [twiceSpell('fire-ray'), twiceSpell('healers-blessing')]],
    ]);
    expect(Number(focus.pool)).toBe(2);
  });

  test("knows only the first take's spell while the second take has no domain", () => {
    const focus = focusOf(twiceCleric([[FIRST_DOMAIN, 'fire']]), twiceContent, twiceRegistry);

    expect(focus.entries.flatMap(({ spells }) => spells.map(({ id }) => String(id)))).toEqual([twiceSpell('fire-ray')]);
    expect(Number(focus.pool)).toBe(1);
  });
});

/** Casters whose class grants focus spells outright, one per case the pool counts. */
const casters = new ContentPackBuilder().withId('pool');
const poolSpell = (name: string): string => casters.idOf(ContentKind.Spell, name);
const UNLOADED = '00000000-0000-4000-8000-0000000000f0';
const CASTERS: readonly (readonly [string, readonly object[]])[] = [
  ['two', [focusEntry('bard-focus'), knows('bard-focus', [poolSpell('one'), poolSpell('two')])]],
  [
    'four',
    [
      focusEntry('bard-focus'),
      knows('bard-focus', [poolSpell('one'), poolSpell('two'), poolSpell('three'), poolSpell('four')]),
    ],
  ],
  ['cantrip', [focusEntry('bard-focus'), knows('bard-focus', [poolSpell('anthem')])]],
  [
    'shared',
    [
      focusEntry('bard-focus'),
      focusEntry('witch-focus'),
      knows('bard-focus', [poolSpell('one')]),
      knows('witch-focus', [poolSpell('one')]),
    ],
  ],
  ['unloaded', [focusEntry('bard-focus'), knows('bard-focus', [UNLOADED])]],
];
casters
  .withSpell('one', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('two', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('three', { rank: 4, traditions: [], traits: ['focus'] })
  .withSpell('four', { rank: 4, traditions: [], traits: ['focus'] })
  .withSpell('anthem', { rank: 1, traditions: [], traits: ['cantrip', 'composition'] });
for (const [name, rules] of CASTERS) {
  casters.withClass(name, ['cha'], { rules });
}
const casterRegistry = new ContentRegistry();
casterRegistry.register(casters.build());
const casterContent = contentOf(casterRegistry);

function poolOf(caster: string): number {
  const builder = new CharacterBuilder().picking('class', casters.idOf(ContentKind.Class, caster));
  return Number(focusOf(builder, casterContent, casterRegistry).pool);
}

describe('characterFocus: the focus pool', () => {
  test('holds one Focus Point per focus spell, at most 3', () => {
    expect(poolOf('two')).toBe(2);
    expect(poolOf('four')).toBe(3);
  });

  test('counts no focus cantrip, a spell two entries know once, and a spell whose content is not loaded not at all', () => {
    expect(poolOf('cantrip')).toBe(0);
    expect(poolOf('shared')).toBe(1);
    expect(poolOf('unloaded')).toBe(0);
  });
});
