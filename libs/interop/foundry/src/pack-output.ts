import { ContentEntry, contentKey } from '@pioneer/rules/sdk';
import type { ContentId, ContentKind, ExternalId, PackId } from '@pioneer/rules/sdk';

import type { KnownEntry } from './entry-references';
import type { FoundryDocument } from './foundry-document';
import { BacklogGapType, BacklogItem, BacklogItemType, LeftOutReason, stripArt } from './import-backlog';
import type { BacklogGap } from './import-backlog';
import type { EnvelopeFields } from './imported-envelope';
import { firstIssue, resolveReferences } from './pack-references';
import type { CheckedOutput, EntryGap, LeftOut } from './pack-references';
import { compendiumUuid } from './translate-envelope';
import type { ImportTranslation } from './translate-import';
import type { ImportedKindData } from './translate-kind-data';

/**
 * Pack output (content-model.md, "Foundry import"): the translated entries that pass `ContentEntry` and whose
 * references all resolve (`resolveReferences`), sorted by pack, kind and slug, and the backlog of everything else,
 * sorted by entry. An entry is left out when it has no kind data, fails the schema, or holds a reference that does
 * not resolve and cannot be dropped.
 */

export interface PackOutputContext {
  /** The entries of the other official packs, which references may land on besides the output's own. */
  readonly known: readonly KnownEntry[];
}

export interface PackOutput {
  readonly entries: readonly ContentEntry[];
  readonly backlog: readonly BacklogItem[];
}

/** One `<kind>.json` file's entries. */
export interface PackFile {
  readonly pack: PackId;
  readonly kind: ContentKind;
  readonly entries: readonly ContentEntry[];
}

interface Candidate {
  readonly envelope: EnvelopeFields;
  readonly foundry?: ExternalId;
  readonly document?: FoundryDocument;
  /** The entry as `ContentEntry` reads it, or undefined when it has no kind data. */
  readonly raw?: object;
}

function idOf({ _id: id }: FoundryDocument): string {
  return id;
}

function compare(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  return left > right ? 1 : 0;
}

/** The entry `ContentEntry` reads: the envelope's address, the kind, the rest of the envelope, then the data. */
function rawEntry({ id, pack, ...envelope }: EnvelopeFields, { kind, data }: ImportedKindData): object {
  return { id, pack, kind, ...envelope, data };
}

function candidates({ entries, archetypes, vocabulary }: ImportTranslation): readonly Candidate[] {
  return [
    ...entries.map(({ source, envelope, kindData }) => ({
      envelope,
      foundry: envelope.externalIds.foundry,
      document: source.document,
      ...(kindData === undefined ? {} : { raw: rawEntry(envelope, kindData) }),
    })),
    ...archetypes.map(({ envelope, kindData }) => ({
      envelope,
      foundry: envelope.externalIds.foundry,
      raw: rawEntry(envelope, kindData),
    })),
    ...vocabulary.map(({ envelope, kindData }) => ({ envelope, raw: rawEntry(envelope, kindData) })),
  ];
}

function validate(all: readonly Candidate[]): CheckedOutput {
  const entries = new Map<ContentId, ContentEntry>();
  const leftOut = new Map<ContentId, LeftOut>();
  for (const { envelope, raw } of all) {
    const parsed = raw === undefined ? undefined : ContentEntry.safeParse(raw);
    if (parsed === undefined) {
      leftOut.set(envelope.id, { reason: LeftOutReason.NoKindData, detail: '' });
    } else if (parsed.success) {
      entries.set(envelope.id, parsed.data);
    } else {
      leftOut.set(envelope.id, { reason: LeftOutReason.InvalidEntry, detail: firstIssue(parsed.error) });
    }
  }
  return { entries, leftOut, dropped: [] };
}

/** Every gap the translation reported against an entry, rule elements first, raw JSON art stripped. */
function reportedGaps({ envelopes, kindDataGaps }: ImportTranslation): readonly EntryGap[] {
  return [
    ...envelopes.untranslatedRules.map(({ entry, key, raw }) => ({
      entry,
      gap: { type: BacklogGapType.Rule, key, raw: stripArt(raw) },
    })),
    ...kindDataGaps.map(({ entry, reason, field, raw }) => ({
      entry,
      gap: { type: BacklogGapType.Field, reason, field, raw: stripArt(raw) },
    })),
    ...envelopes.unresolvedText.map(({ entry, reason, key }) => ({
      entry,
      gap: { type: BacklogGapType.Text, reason, key },
    })),
    ...envelopes.untranslatedEnrichers.map(({ entry, enricher }) => ({
      entry,
      gap: { type: BacklogGapType.Enricher, enricher },
    })),
    ...envelopes.unknownMarkup.map(({ entry, markup }) => ({ entry, gap: { type: BacklogGapType.Markup, markup } })),
    ...envelopes.unknownTraits.map(({ entry, trait }) => ({ entry, gap: { type: BacklogGapType.Trait, trait } })),
  ];
}

function gapsByEntry(all: readonly EntryGap[]): ReadonlyMap<ContentId, readonly BacklogGap[]> {
  const gaps = new Map<ContentId, BacklogGap[]>();
  for (const { entry, gap } of all) {
    gaps.set(entry, [...(gaps.get(entry) ?? []), gap]);
  }
  return gaps;
}

function entryItems(
  all: readonly Candidate[],
  gaps: ReadonlyMap<ContentId, readonly BacklogGap[]>,
  leftOut: ReadonlyMap<ContentId, LeftOut>,
): BacklogItem[] {
  return all
    .toSorted(
      (left, right) =>
        compare(left.envelope.pack, right.envelope.pack) || compare(left.envelope.slug, right.envelope.slug),
    )
    .flatMap(({ envelope: { id, pack, slug }, foundry, document }): BacklogItem[] => {
      const entryGaps = gaps.get(id) ?? [];
      const left = leftOut.get(id);
      if (entryGaps.length === 0 && left === undefined) {
        return [];
      }
      return [
        BacklogItem.parse({
          type: BacklogItemType.Entry,
          pack,
          slug,
          ...(foundry === undefined ? {} : { foundry }),
          ...(left === undefined ? {} : { leftOut: left }),
          gaps: entryGaps,
          ...(left === undefined || document === undefined ? {} : { document: stripArt(document) }),
        }),
      ];
    });
}

function documentItems({ envelopes }: ImportTranslation): BacklogItem[] {
  return envelopes.failures
    .map(({ pack, document, reason, detail }) => ({
      foundry: compendiumUuid(pack, idOf(document), document.type),
      document,
      reason,
      detail,
    }))
    .toSorted((left, right) => compare(left.foundry, right.foundry))
    .map(({ foundry, document, reason, detail }) =>
      BacklogItem.parse({ type: BacklogItemType.Document, foundry, reason, detail, document: stripArt(document) }),
    );
}

function vocabularyItems({ vocabularyGaps }: ImportTranslation): BacklogItem[] {
  return vocabularyGaps
    .toSorted(
      (left, right) =>
        compare(left.kind, right.kind) || compare(left.slug, right.slug) || compare(left.reason, right.reason),
    )
    .map(({ kind, slug, reason, detail }) =>
      BacklogItem.parse({ type: BacklogItemType.Vocabulary, kind, slug, reason, detail }),
    );
}

export function packOutput(translation: ImportTranslation, { known }: PackOutputContext): PackOutput {
  const all = candidates(translation);
  const output = validate(all);
  resolveReferences(output, {
    known: new Set(known.map(({ id }) => id)),
    keys: new Map(all.map(({ envelope: { id, pack, slug } }) => [id, contentKey(pack, slug)])),
    names: new Map(all.map(({ envelope: { id, name } }) => [id, name])),
  });
  const entries = [...output.entries.values()].toSorted(
    (left, right) => compare(left.pack, right.pack) || compare(left.kind, right.kind) || compare(left.slug, right.slug),
  );
  return {
    entries,
    backlog: [
      ...entryItems(all, gapsByEntry([...reportedGaps(translation), ...output.dropped]), output.leftOut),
      ...documentItems(translation),
      ...vocabularyItems(translation),
    ],
  };
}

/** `entries`, sorted as `packOutput` sorts them, grouped into one file per pack and kind. */
export function packFiles(entries: readonly ContentEntry[]): readonly PackFile[] {
  const files = new Map<string, PackFile & { readonly entries: ContentEntry[] }>();
  for (const entry of entries) {
    const key = `${entry.pack}/${entry.kind}`;
    const file = files.get(key) ?? { pack: entry.pack, kind: entry.kind, entries: [] };
    file.entries.push(entry);
    files.set(key, file);
  }
  return [...files.values()];
}
