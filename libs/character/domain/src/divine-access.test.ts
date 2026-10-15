import { describe, expect, test } from 'bun:test';

import { ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import type { PreparedSlot } from './prepared-spells';
import { preparedSlots } from './prepared-spells';
import { preparedReads, slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import { CharacterBuilder } from './testing';

/**
 * An oracle as the importer gives one (ADR-0063), shrunk: a spontaneous divine entry with slots by level, and Divine
 * Access: a choice of the deities that grant a fire domain, and up to two spells of the deity picked.
 */
const pack = new ContentPackBuilder().withId('oracle-access');
for (const [name, rank] of [
  ['sun-first', 1],
  ['sun-third', 3],
  ['sun-fifth', 5],
  ['sea-first', 1],
] as const) {
  pack.withSpell(name, { rank, traditions: ['divine'] });
}
const spell = (name: string): ContentId => ContentId.parse(pack.idOf(ContentKind.Spell, name));
const slotRule = (rank: number, value: number, level: number): object => ({
  key: 'SpellSlots',
  entry: 'oracle',
  rank,
  value,
  ...(level > 1 ? { predicate: [{ gte: ['self:level', level] }] } : {}),
});
const ACCESS = pack.idOf(ContentKind.ClassFeature, 'divine-access');
pack
  .withDeity('sun', {
    domains: { primary: ['fire'], alternate: [] },
    spells: [
      { rank: 1, spell: spell('sun-first') },
      { rank: 3, spell: spell('sun-third') },
      { rank: 5, spell: spell('sun-fifth') },
    ],
  })
  .withDeity('sea', {
    domains: { primary: ['water'], alternate: ['fire'] },
    spells: [{ rank: 1, spell: spell('sea-first') }],
  })
  .withDeity('unrelated', {
    domains: { primary: ['water'], alternate: [] },
    spells: [{ rank: 1, spell: spell('sea-first') }],
  })
  .withClassFeature('divine-access', {
    rules: [
      { key: 'SpellcastingEntry', slug: 'oracle', tradition: 'divine', attribute: 'cha', preparation: 'spontaneous' },
      slotRule(1, 2, 1),
      slotRule(2, 2, 3),
      slotRule(3, 2, 5),
      {
        key: 'ChoiceSet',
        flag: 'divine-access-deity',
        choices: { kind: 'deity', filter: [{ or: ['item:domain:fire', 'item:alternate-domain:fire'] }] },
      },
      { key: 'RepertoireDeitySpells', entry: 'oracle', choice: 'divine-access-deity', value: 2 },
    ],
  })
  .withClass('oracle', ['cha'], { rules: [{ key: 'GrantItem', item: ACCESS }] });
const registry = new ContentRegistry();
registry.register(pack.build());
const content: SlotContent = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const DEITY_SLOT = `${ACCESS}:4`;
const FIRST_SLOT = 'repertoire:oracle:divine-access-deity:0';

/** An oracle at `level` with `picks`, slot key to spell name, besides the deity (and the deity, when `deity` names one). */
function oracle(level: number, picks: Readonly<Record<string, string>>): CharacterBuilder {
  let builder = new CharacterBuilder()
    .atLevel(level)
    .picking('class', pack.idOf(ContentKind.Class, 'oracle'))
    .picking('boost:1:class:0', 'cha');
  for (const [key, name] of Object.entries(picks)) {
    builder = builder.picking(key, spell(name));
  }
  return builder;
}

function slotsOf(builder: CharacterBuilder): PreparedSlot[] {
  const { document } = builder.build();
  return preparedSlots(document, preparedReads(document, content));
}

/** The slots of an oracle at `level` that picked `deity`, and spells by slot key. */
function withDeity(level: number, deity: string, picks: Readonly<Record<string, string>> = {}): PreparedSlot[] {
  return slotsOf(oracle(level, picks).picking(DEITY_SLOT, pack.idOf(ContentKind.Deity, deity)));
}

const deitySlots = (found: readonly PreparedSlot[]): PreparedSlot[] => found.filter((slot) => slot.deitySpell);
/** What the first deity slot of `found` offers, by name. */
function firstOffer(found: readonly PreparedSlot[]): string[] {
  const [first] = deitySlots(found);
  return first.options.map((each) => String(each.name));
}

describe('Divine Access', () => {
  test('gives no slot until the deity is picked', () => {
    const found = slotsOf(oracle(5, {}));

    expect(deitySlots(found)).toStrictEqual([]);
  });

  test('gives its slots once a deity is picked, apart from the entry’s own', () => {
    const found = withDeity(5, 'sun');
    const keys = deitySlots(found).map((slot) => String(slot.key));
    const own = found.filter((slot) => slot.rank === 1).filter((slot) => !slot.deitySpell);

    expect(keys).toStrictEqual([FIRST_SLOT, 'repertoire:oracle:divine-access-deity:1']);
    expect(own).toHaveLength(2);
  });

  test('offers the deity’s spells up to the highest rank the entry has slots of', () => {
    const early = firstOffer(withDeity(1, 'sun'));
    const later = firstOffer(withDeity(5, 'sun')).toSorted();

    expect(early).toStrictEqual(['Sun-first']);
    expect(later).toStrictEqual(['Sun-first', 'Sun-third']);
  });

  test('offers only the picked deity’s spells', () => {
    expect(firstOffer(withDeity(5, 'sea'))).toStrictEqual(['Sea-first']);
  });

  test('reads a filled slot at the spell’s own rank', () => {
    const slot = deitySlots(withDeity(5, 'sun', { [FIRST_SLOT]: 'sun-third' })).at(0);

    expect(slot?.rank).toBe(3);
    expect(slot?.pick).toBeDefined();
  });
});

describe('Divine Access deity choice', () => {
  test('does not offer a deity that grants none of the mystery’s domains', () => {
    expect(deitySlots(withDeity(5, 'unrelated'))).toStrictEqual([]);
  });
});
