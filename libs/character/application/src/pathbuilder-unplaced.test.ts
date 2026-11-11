import { describe, expect, test } from 'bun:test';

import { LanguageName } from '@pioneer/character/domain';
import { ImportKind, PathbuilderName } from '@pioneer/interop/pathbuilder';
import type { ContentLookup, ImportedFeat } from '@pioneer/interop/pathbuilder';
import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { keptPicks } from './pathbuilder-unplaced';

const pack = PackId.parse('player-core');
const elven = ContentId.parse(contentId(pack, EntrySlug.parse('language:elven')));
const dodge = ContentId.parse(contentId(pack, EntrySlug.parse('feat:nimble-dodge')));
const planarBinding = ContentId.parse(contentId(pack, EntrySlug.parse('ritual:planar-binding')));
const layOnHands = ContentId.parse(contentId(pack, EntrySlug.parse('class-feature:lay-on-hands')));
const iomedae = ContentId.parse(contentId(pack, EntrySlug.parse('deity:iomedae')));
const fireball = ContentId.parse(contentId(pack, EntrySlug.parse('spell:fireball')));

/** A lookup that knows Elven and Nimble Dodge, by name. */
const lookup = {
  resolve: (kind: ImportKind, name: string) => {
    const known: Partial<Record<ImportKind, Record<string, typeof elven>>> = {
      [ImportKind.Language]: { Elven: elven },
      [ImportKind.Feat]: { 'Nimble Dodge': dodge },
      [ImportKind.Ritual]: { 'Planar Binding': planarBinding },
      [ImportKind.ClassFeature]: { 'Lay on Hands': layOnHands },
      [ImportKind.Deity]: { Iomedae: iomedae },
      [ImportKind.Spell]: { Fireball: fireball },
    };
    const id = known[kind]?.[name];
    return id === undefined ? undefined : { id, name };
  },
} as unknown as ContentLookup;

const name = (value: string): PathbuilderName => PathbuilderName.parse(value);

/** The picks a test is not about. */
const NOTHING_ELSE = { classFeatures: [], deity: undefined, spells: [] } as const;

describe('keptPicks', () => {
  test('keeps each matched feat and language once, and leaves out a name that matched nothing', () => {
    const feats = [
      { name: name('Nimble Dodge') },
      { name: name('Nimble Dodge') },
    ] as unknown as readonly ImportedFeat[];
    const picks = keptPicks(
      { feats, languages: [name('Elven'), name('Elven')], customLanguages: [], rituals: [], ...NOTHING_ELSE },
      lookup,
    );
    expect(picks).toStrictEqual({
      unplacedFeats: [dodge],
      unplacedLanguages: [elven],
      customLanguages: [],
      rituals: [],
      classFeatures: [],
      deity: undefined,
      unplacedSpells: [],
    });
  });

  test('keeps a language no content defines by name, once whatever its case', () => {
    const customLanguages = [name('Wildsong'), name('wildsong'), name('Klingon')];
    const picks = keptPicks({ feats: [], languages: [], customLanguages, rituals: [], ...NOTHING_ELSE }, lookup);
    expect(picks.customLanguages).toStrictEqual([LanguageName.parse('Wildsong'), LanguageName.parse('Klingon')]);
  });

  test('keeps each matched ritual once, and leaves out a ritual that matched nothing', () => {
    const rituals = [name('Planar Binding'), name('Planar Binding'), name('Summon Dread')];
    expect(
      keptPicks({ feats: [], languages: [], customLanguages: [], rituals, ...NOTHING_ELSE }, lookup).rituals,
    ).toStrictEqual([planarBinding]);
  });

  test('keeps each matched class feature once, the deity and the spells no slot took', () => {
    const picks = keptPicks(
      {
        feats: [],
        languages: [],
        customLanguages: [],
        rituals: [],
        classFeatures: [name('Lay on Hands'), name('Lay on Hands'), name('Domain: Fate')],
        deity: name('Iomedae'),
        spells: [name('Fireball'), name('Fireball'), name('Wish')],
      },
      lookup,
    );
    expect(picks.classFeatures).toStrictEqual([layOnHands]);
    expect(picks.deity).toBe(iomedae);
    expect(picks.unplacedSpells).toStrictEqual([fireball]);
  });

  test('leaves the deity off when none matched', () => {
    const picks = keptPicks(
      {
        feats: [],
        languages: [],
        customLanguages: [],
        rituals: [],
        classFeatures: [],
        deity: name('Zeus'),
        spells: [],
      },
      lookup,
    );
    expect(picks.deity).toBeUndefined();
  });
});
