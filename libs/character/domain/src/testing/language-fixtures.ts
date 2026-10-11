import { Attribute, ContentId, ContentKind } from '@pioneer/rules/sdk';
import type { ContentPack } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';

import type { LanguageContent } from '../language-content';

/** No languages and no ancestries: language slots never open. For tests about other slots. */
export const NO_LANGUAGES: LanguageContent = { languages: [], language: () => undefined, ancestry: () => undefined };

const PACK = 'language-fixtures';
const ALL: readonly Attribute[] = Object.values(Attribute);
const ids = new ContentPackBuilder().withId(PACK);

export type LanguageFixture = 'common' | 'dwarven' | 'elven' | 'goblin' | 'draconic' | 'petran' | 'empyrean' | 'aklo';

/** The backgrounds standing in for features: one granting Empyrean, one like Multilingual, one granting Dwarven, one granting
 * Elven from 5th level. */
export type LanguageBackground = 'envoy' | 'linguist' | 'dwarf-friend' | 'scholar';

/** The id of a language in `languageFixtures`. */
export function languageFixtureId(name: LanguageFixture): ContentId {
  return ContentId.parse(ids.idOf(ContentKind.Language, name));
}

export function languageBackgroundId(name: LanguageBackground): string {
  return ids.idOf(ContentKind.Background, name);
}

/** The dwarf of `languageFixtures`: Common and Dwarven, and one more from Goblin, Petran or a common language. */
export const languageDwarfId: string = ids.idOf(ContentKind.Ancestry, 'dwarf');

/** An orc of `languageFixtures` with an Intelligence flaw: Common, and one more language. */
export const languageOrcId: string = ids.idOf(ContentKind.Ancestry, 'orc');

/** Society's rank as a number in a predicate (`skill:society:rank`): master 3, legendary 4. */
const MASTER = 3;
const LEGENDARY = 4;
/** The level the scholar background grants Elven from. */
const SCHOLAR_LEVEL = 5;

/** Multilingual's elements: two slots, and one more each at master and at legendary in Society. */
const MULTILINGUAL_RULES = [
  { key: 'Language', slots: 2, access: 'uncommon' },
  { key: 'Language', slots: 1, access: 'uncommon', predicate: [{ gte: ['skill:society:rank', MASTER] }] },
  { key: 'Language', slots: 1, access: 'uncommon', predicate: [{ gte: ['skill:society:rank', LEGENDARY] }] },
];

/**
 * Common, uncommon and rare languages, a dwarf ancestry whose free boost may raise Intelligence, and backgrounds with
 * `Language` elements standing in for the feats that carry them.
 */
export function languageFixtures(): ContentPack {
  return new ContentPackBuilder()
    .withId(PACK)
    .withLanguage('common')
    .withLanguage('dwarven')
    .withLanguage('elven')
    .withLanguage('goblin')
    .withLanguage('draconic')
    .withLanguage('petran', 'uncommon')
    .withLanguage('empyrean', 'uncommon')
    .withLanguage('aklo', 'rare')
    .withAncestry('dwarf', {
      boosts: [ALL],
      languages: [languageFixtureId('common'), languageFixtureId('dwarven')],
      additionalLanguages: { count: 1, options: [languageFixtureId('goblin'), languageFixtureId('petran')] },
    })
    .withBackground('envoy', [ALL], [{ key: 'Language', grant: [languageFixtureId('empyrean')] }])
    .withBackground('linguist', [ALL], MULTILINGUAL_RULES)
    .withBackground('dwarf-friend', [ALL], [{ key: 'Language', grant: [languageFixtureId('dwarven')] }])
    .withBackground(
      'scholar',
      [ALL],
      [{ key: 'Language', grant: [languageFixtureId('elven')], predicate: [{ gte: ['self:level', SCHOLAR_LEVEL] }] }],
    )
    .withAncestry('orc', {
      flaws: [Attribute.Intelligence],
      boosts: [ALL],
      languages: [languageFixtureId('common')],
      additionalLanguages: { count: 1, options: [] },
    })
    .build();
}
