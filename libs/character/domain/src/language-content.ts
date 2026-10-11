import { AncestryId, ContentId, ContentKind, LanguageCount } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry, ContentText, Rarity } from '@pioneer/rules/sdk';

/** A language a pick names: its entry, name and rarity. */
export interface LanguageOption {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly rarity: Rarity;
}

/** What an ancestry gives the languages: those every member speaks, and how many more to pick, from which. */
export interface AncestryLanguages {
  /** The ancestry, which the languages it grants are known from. */
  readonly id: ContentId;
  readonly name: ContentText;
  readonly granted: readonly ContentId[];
  readonly count: LanguageCount;
  readonly options: readonly ContentId[];
}

/** What language slots are read from: every loaded language, the one a pick names, and each ancestry's languages. */
export interface LanguageContent {
  /** By name. */
  readonly languages: readonly LanguageOption[];
  readonly language: (pick: ChoiceValue) => LanguageOption | undefined;
  readonly ancestry: (id: ContentId) => AncestryLanguages | undefined;
}

const NONE = LanguageCount.parse(0);

/** The registry's languages and its ancestries' languages. */
export function languageContent(registry: ContentRegistry): LanguageContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const byId = new Map(
    entries.flatMap((entry): [ContentId, LanguageOption][] =>
      entry.kind === ContentKind.Language ? [[entry.id, { id: entry.id, name: entry.name, rarity: entry.rarity }]] : [],
    ),
  );
  const languages = [...byId.values()].toSorted((left, right) => left.name.localeCompare(right.name));
  return {
    languages,
    language: (pick: ChoiceValue): LanguageOption | undefined => {
      const id = ContentId.safeParse(pick);
      return id.success ? byId.get(id.data) : undefined;
    },
    ancestry: (id: ContentId): AncestryLanguages | undefined => {
      const definition = registry.ancestry(AncestryId.parse(id))?.definition;
      if (definition === undefined) {
        return undefined;
      }
      const { languages: spoken = [], additionalLanguages } = definition;
      return {
        id,
        name: definition.name,
        granted: spoken,
        count: additionalLanguages?.count ?? NONE,
        options: additionalLanguages?.options ?? [],
      };
    },
  };
}
