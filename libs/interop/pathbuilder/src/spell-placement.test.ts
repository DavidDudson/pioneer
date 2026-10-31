import { describe, expect, test } from 'bun:test';

import { slotContent } from '@pioneer/character/domain';
import type { CharacterDocument } from '@pioneer/character/domain';
import {
  CharacterBuilder,
  playerCoreClasses,
  playerCoreClassId,
  spellFixtureId,
  spellFixtures,
} from '@pioneer/character/domain/testing';
import type { PlayerCoreClass, SpellFixture } from '@pioneer/character/domain/testing';
import { ContentRegistry, ContentText, SlotRank, SpellPreparation } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { entryLookup } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedCaster, ImportedSpellRank } from './read-spells';
import { placeSpells, SpellGapReason } from './spell-placement';
import type { SpellGap } from './spell-placement';

const registry = new ContentRegistry();
registry.register(playerCoreClasses());
registry.register(spellFixtures());
const slots = { ...slotContent(registry), namespaces: CORE_NAMESPACES };

const SPELL_NAMES: Readonly<Record<SpellFixture, string>> = {
  'detect-magic': 'Detect Magic',
  shield: 'Shield',
  'force-barrage': 'Force Barrage',
  heal: 'Heal',
  fireball: 'Fireball',
  'veil-of-privacy': 'Veil of Privacy',
  wish: 'Wish',
  'ring-of-truth': 'Ring of Truth',
  'force-bolt': 'Force Bolt',
};
const lookup = entryLookup({
  [ImportKind.Spell]: Object.entries(SPELL_NAMES).map(([fixture, name]) => ({
    id: spellFixtureId(fixture as SpellFixture),
    name: ContentText.parse(name),
  })),
});
const content = { slots, lookup };

const KEY_ATTRIBUTE = 'boost:1:class:0';

/** Each gap as `Wizard 1 Heal not-offered`. */
function gapLines(gaps: readonly SpellGap[]): string[] {
  return gaps.map((gap) => `${gap.caster} ${gap.rank} ${gap.name} ${gap.reason}`);
}

function character(name: PlayerCoreClass): CharacterDocument {
  return new CharacterBuilder()
    .named(name)
    .picking('class', playerCoreClassId(name))
    .picking(KEY_ATTRIBUTE, 'str')
    .atLevel(1)
    .build().document;
}

function ranked(at: ImportedSpellRank['rank'], ...spells: readonly string[]): ImportedSpellRank {
  return { rank: at, spells: spells.map((spell) => PathbuilderName.parse(spell)) };
}

// oxlint-disable-next-line eslint/max-params -- a fixture builder: the rest parameter is the ranks
function caster(
  name: string,
  tradition: string,
  preparation: ImportedCaster['preparation'],
  ...ranks: readonly ImportedSpellRank[]
): ImportedCaster {
  return {
    name: PathbuilderName.parse(name),
    tradition: PathbuilderName.parse(tradition),
    preparation,
    innate: preparation === undefined,
    ranks,
    perDay: [],
  };
}

function picked(choices: Readonly<Record<SlotKey, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(choices));
}

describe('placeSpells', () => {
  const wizard = character('wizard');

  test('puts each listed spell in the first open slot of its rank that offers it', () => {
    const { choices, gaps } = placeSpells(wizard, content, [
      caster(
        'Wizard',
        'arcane',
        SpellPreparation.Prepared,
        ranked(SlotRank.Cantrip, 'Detect Magic', 'Shield'),
        ranked(1, 'Force Barrage'),
      ),
    ]);
    expect(picked(choices)).toStrictEqual({
      'prepared:wizard:cantrip:0': spellFixtureId('detect-magic'),
      'prepared:wizard:cantrip:1': spellFixtureId('shield'),
      'prepared:wizard:1:0': spellFixtureId('force-barrage'),
    });
    expect(gaps).toStrictEqual([]);
  });

  test('a spell listed twice takes two slots', () => {
    const { choices } = placeSpells(wizard, content, [
      caster('Wizard', 'arcane', SpellPreparation.Prepared, ranked(1, 'Force Barrage', 'Force Barrage')),
    ]);
    expect(Object.keys(choices)).toStrictEqual(['prepared:wizard:1:0', 'prepared:wizard:1:1']);
  });

  test('a spell with no slot of its rank left is a gap', () => {
    const { gaps } = placeSpells(wizard, content, [
      caster(
        'Wizard',
        'arcane',
        SpellPreparation.Prepared,
        ranked(1, 'Force Barrage', 'Force Barrage', 'Force Barrage'),
      ),
    ]);
    expect(gapLines(gaps)).toStrictEqual([`Wizard 1 Force Barrage ${SpellGapReason.NoSlot}`]);
  });

  test('a spell of another tradition, or with no access, is a gap although slots of its rank are open', () => {
    const { choices, gaps } = placeSpells(wizard, content, [
      caster(
        'Wizard',
        'arcane',
        SpellPreparation.Prepared,
        ranked(1, 'Heal'),
        ranked(SlotRank.Cantrip, 'Detect Magic'),
      ),
    ]);
    expect(Object.keys(choices)).toStrictEqual(['prepared:wizard:cantrip:0']);
    expect(gapLines(gaps)).toStrictEqual([`Wizard 1 Heal ${SpellGapReason.NotOffered}`]);
  });

  test('a caster the character has no spellcasting for leaves its spells as gaps', () => {
    const { choices, gaps } = placeSpells(wizard, content, [
      caster('Archetype Sorcerer', 'occult', SpellPreparation.Spontaneous, ranked(1, 'Force Barrage')),
      caster('Grown of Oak', 'primal', undefined, ranked(2, 'Heal')),
    ]);
    expect(choices).toStrictEqual({});
    expect(gaps.map(({ caster: name, reason }) => `${name}: ${reason}`)).toStrictEqual([
      'Archetype Sorcerer: no-entry',
      'Grown of Oak: no-entry',
    ]);
  });

  test('a name the content does not have is left to the unmatched list', () => {
    const { choices, gaps } = placeSpells(wizard, content, [
      caster('Wizard', 'arcane', SpellPreparation.Prepared, ranked(1, 'Not A Spell')),
    ]);
    expect(choices).toStrictEqual({});
    expect(gaps).toStrictEqual([]);
  });

  test('a spontaneous caster fills its repertoire', () => {
    const { choices, gaps } = placeSpells(character('bard'), content, [
      caster('Bard', 'occult', SpellPreparation.Spontaneous, ranked(SlotRank.Cantrip, 'Detect Magic')),
    ]);
    expect(Object.keys(choices)).toStrictEqual(['repertoire:bard:cantrip:0']);
    expect(gaps).toStrictEqual([]);
  });
});
