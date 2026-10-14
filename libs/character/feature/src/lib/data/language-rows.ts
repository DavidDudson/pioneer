import { languageContent } from '@pioneer/character/domain';
import { ContentId, ContentKind, Rarity } from '@pioneer/rules/sdk';
import type { ContentRegistry, SourceRef } from '@pioneer/rules/sdk';
import type { LanguagePickerRow } from '@pioneer/rules/ui';

/** A language the next open slot offers, as the server read it. */
export interface OfferedLanguage {
  readonly id: string;
  readonly name: string;
}

/** What the language rows read besides the content: the languages the character knows, by id. */
export interface LanguageRowReads {
  readonly known: ReadonlySet<string>;
}

/** The sources of each language entry, by registry: a registry's packs never change once loaded. */
const SOURCES = new WeakMap<ContentRegistry, ReadonlyMap<ContentId, readonly SourceRef[]>>();

function sourcesOf(registry: ContentRegistry): ReadonlyMap<ContentId, readonly SourceRef[]> {
  const read =
    SOURCES.get(registry) ??
    new Map(
      registry.packs.flatMap((pack) =>
        pack.otherEntries.flatMap((entry): [ContentId, readonly SourceRef[]][] =>
          entry.kind === ContentKind.Language ? [[entry.id, entry.sources]] : [],
        ),
      ),
    );
  SOURCES.set(registry, read);
  return read;
}

/**
 * The rows of the language picker: each language the next slot offers with its rarity, whether the character knows it
 * and where it comes from. A language the loaded packs don't define reads as common with no source.
 */
export function languageRows(
  registry: ContentRegistry,
  offered: readonly OfferedLanguage[],
  { known }: LanguageRowReads,
): readonly LanguagePickerRow[] {
  const rarities = new Map(languageContent(registry).languages.map((each) => [String(each.id), each.rarity]));
  const sources = sourcesOf(registry);
  return offered.map(({ id, name }): LanguagePickerRow => {
    const content = ContentId.safeParse(id);
    return {
      id,
      name,
      rarity: rarities.get(id) ?? Rarity.Common,
      known: known.has(id),
      sources: (content.success ? sources.get(content.data) : undefined) ?? [],
      disabledReason: undefined,
    };
  });
}
