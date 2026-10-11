import { ContentKind, slugName, Trait } from '@pioneer/rules/sdk';
import type { BookId, PackId } from '@pioneer/rules/sdk';

import { entryReferences } from './entry-references';
import type { KnownEntry } from './entry-references';
import { entrySlugs } from './entry-slugs';
import type { FoundryConfig } from './foundry-config';
import { foundryLinks } from './foundry-links';
import type { FoundryLang, JournalDocument, PackDocument } from './foundry-release';
import type { ImportedEnvelope } from './imported-envelope';
import type { KindDataGap } from './kind-data-gaps';
import type { SelectedEntry } from './select-entries';
import { importArchetypes } from './translate-archetype';
import type { ArchetypeEntry } from './translate-archetype';
import { translateEnvelopes } from './translate-envelope';
import type { EnvelopeTranslation } from './translate-envelope';
import { translateKindData } from './translate-kind-data';
import type { ImportedKindData } from './translate-kind-data';
import { importVocabulary } from './vocabulary';
import type { VocabularyEntry, VocabularyGap } from './vocabulary';

/**
 * One import's translation: the vocabulary entries the selected documents use, each document's envelope and kind
 * data, and everything that did not carry over. Vocabulary entries go into their own pack, so their slugs and the
 * documents' never meet.
 */

export interface ImportContext {
  readonly pack: PackId;
  /** Where vocabulary entries go: `core-rules`, so trait slugs never clash with the target pack's entries (the `dwarf`
   * trait and ancestry). */
  readonly vocabularyPack: PackId;
  /** The run's target books, in the order given. */
  readonly books: readonly BookId[];
  readonly config: FoundryConfig;
  readonly lang: FoundryLang;
  /** The entries of the other official packs (the target pack's own are replaced by the import). */
  readonly known: readonly KnownEntry[];
  /** The release's item documents, naming link targets outside the import; without them such links read as labels. */
  readonly documents?: readonly PackDocument[];
  /** The release's journals, for the archetypes Foundry keeps as journal pages; without them none are imported. */
  readonly journals?: readonly JournalDocument[];
}

export interface ImportedEntry {
  readonly source: SelectedEntry;
  readonly envelope: ImportedEnvelope;
  /** Absent while the document's kind has no translator yet, or when its data failed. */
  readonly kindData?: ImportedKindData;
}

export interface ImportTranslation {
  readonly envelopes: EnvelopeTranslation;
  readonly entries: readonly ImportedEntry[];
  /** Archetypes from the archetypes journal, whose dedications the import brings in. */
  readonly archetypes: readonly ArchetypeEntry[];
  readonly vocabulary: readonly VocabularyEntry[];
  readonly vocabularyGaps: readonly VocabularyGap[];
  readonly kindDataGaps: readonly KindDataGap[];
}

function knownOf({ envelope, kindData }: VocabularyEntry): KnownEntry {
  return { id: envelope.id, pack: envelope.pack, kind: kindData.kind, slug: envelope.slug };
}

export function translateImport(selected: readonly SelectedEntry[], context: ImportContext): ImportTranslation {
  const { pack, vocabularyPack, known } = context;
  const vocabulary = importVocabulary(selected, { ...context, pack: vocabularyPack });
  const all = [...known, ...vocabulary.entries.map((entry) => knownOf(entry))];
  const slugs = entrySlugs(selected);
  const references = entryReferences(pack, slugs, all);
  const traits = new Set(
    all.filter(({ kind }) => kind === ContentKind.Trait).map(({ slug }) => Trait.parse(slugName(slug))),
  );
  const { documents } = context;
  const envelopes = translateEnvelopes(selected, {
    pack,
    traits,
    references,
    ...(documents === undefined ? {} : { documents }),
  });
  const archetypes = importArchetypes(context.journals ?? [], {
    pack,
    references,
    envelopes: new Map(envelopes.entries.map(({ envelope }) => [envelope.id, envelope])),
    links: foundryLinks(
      documents ?? [],
      envelopes.entries.map(({ source, envelope }) => ({ source, id: envelope.id })),
    ),
  });
  const translated = envelopes.entries.map(({ source, envelope }) => {
    const { rules, ...rest } = translateKindData(source, envelope, {
      references,
      archetypes: archetypes.byFeat,
    });
    return { source, envelope: { ...envelope, rules: [...envelope.rules, ...rules] }, ...rest };
  });
  return {
    envelopes,
    entries: translated.map(({ source, envelope, kindData }) => ({
      source,
      envelope,
      ...(kindData === undefined ? {} : { kindData }),
    })),
    archetypes: archetypes.entries,
    vocabulary: vocabulary.entries,
    vocabularyGaps: vocabulary.gaps,
    kindDataGaps: [...archetypes.gaps, ...translated.flatMap(({ gaps }) => gaps)],
  };
}
