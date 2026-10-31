import { ContentId, contentId, ContentKind, ContentText, EntrySlug, ExternalId, Trait } from '@pioneer/rules/sdk';
import type { KIND_DATA, PackId } from '@pioneer/rules/sdk';
import type * as z from 'zod';

import type { FoundryLinks } from './enricher-context';
import { resolveSlug, resolveUuid } from './entry-references';
import type { EntryReferences } from './entry-references';
import type { FoundryJournal, FoundryJournalPage } from './foundry-journal';
import type { JournalDocument } from './foundry-release';
import { asciiNameSlug } from './foundry-slug';
import { htmlToRichText } from './html-rich-text';
import type { ImportedEnvelope } from './imported-envelope';
import { KindDataGapReason } from './kind-data-gaps';
import type { KindDataGap } from './kind-data-gaps';

/**
 * Archetype entries from the pages of Foundry's archetypes journal (content-model.md, "Archetypes"). Foundry has no
 * archetype item: a page names the archetype and links its feats, the one with the `dedication` trait and the page's
 * name opening it (another archetype's dedication can appear as a prerequisite).
 * An archetype is imported when its dedication is, and takes the dedication's rarity, source and licence (the page is as legacy as its dedication); a multiclass
 * archetype links the class it is named after. Each archetype feat learns its archetype from the pages that link it.
 */

/** The journal Foundry keeps archetypes in. */
const ARCHETYPES_JOURNAL = 'Archetypes';

const DEDICATION = Trait.parse('dedication');
const MULTICLASS = Trait.parse('multiclass');

/**
 * `@UUID[...]` and `@Embed[...]` naming a feat, as an archetype page links its feats. A UUID may name the feat
 * (`Item.Acrobat Dedication`), spaces and all; an embed names it by id, and its options follow a space.
 */
const FEAT_LINK =
  /@UUID\[(?<uuid>Compendium\.pf2e\.feats-srd\.Item\.[^\]]+)\]|@Embed\[(?<embed>Compendium\.pf2e\.feats-srd\.Item\.[^\]\s]+)/gu;

/** Where a page's introduction ends: its first heading or embedded feat. */
const INTRODUCTION_END = /<h[1-6][\s>]|<p>\s*@Embed\[/u;

/** An archetype's `data`, which the SDK exports through `KIND_DATA` alone. */
type ArchetypeData = z.infer<(typeof KIND_DATA)[typeof ContentKind.Archetype]>;

export interface ArchetypeEntry {
  readonly envelope: ImportedEnvelope;
  readonly kindData: { readonly kind: typeof ContentKind.Archetype; readonly data: ArchetypeData };
}

/** An archetype a feat's page belongs to, with its dedication's name, which an archetype feat's prerequisites cite. */
export interface ArchetypeLink {
  readonly archetype: ContentId;
  readonly dedication: ContentText;
}

export interface Archetypes {
  readonly entries: readonly ArchetypeEntry[];
  /** Every archetype whose page links a feat, by the feat's id, in journal order. */
  readonly byFeat: ReadonlyMap<ContentId, readonly ArchetypeLink[]>;
  readonly gaps: readonly KindDataGap[];
}

export interface ArchetypeContext {
  readonly pack: PackId;
  readonly references: EntryReferences;
  /** The translated envelopes, by id: a dedication's rarity, source and traits. */
  readonly envelopes: ReadonlyMap<ContentId, ImportedEnvelope>;
  readonly links: FoundryLinks;
}

/** The feats a page links, by id, each once, in page order; links to anything outside the import are left out. */
function linkedFeats(content: string, { references }: ArchetypeContext): ContentId[] {
  const ids = [...content.matchAll(FEAT_LINK)].flatMap(({ groups }) => {
    const id = resolveUuid(references, groups?.['uuid'] ?? groups?.['embed'] ?? '');
    return id !== undefined && references.kinds.get(id) === ContentKind.Feat ? [id] : [];
  });
  return [...new Set(ids)];
}

/** A journal page and the journal holding it. */
interface Page {
  readonly journal: FoundryJournal;
  readonly page: FoundryJournalPage;
}

function pageUuid({ journal, page }: Page): ExternalId {
  const { _id: journalId } = journal;
  const { _id: pageId } = page;
  return ExternalId.parse(`Compendium.pf2e.journals.JournalEntry.${journalId}.JournalEntryPage.${pageId}`);
}

interface Built {
  readonly entry: ArchetypeEntry;
  readonly feats: readonly ContentId[];
  readonly gaps: readonly KindDataGap[];
}

/** The page's dedication: a linked feat with the `dedication` trait whose name starts with the page's. */
function dedicationOf(
  name: string,
  feats: readonly ContentId[],
  { envelopes }: ArchetypeContext,
): ImportedEnvelope | undefined {
  const opening = name.toLowerCase();
  return feats
    .map((feat) => envelopes.get(feat))
    .find(
      (envelope) => envelope?.traits.includes(DEDICATION) === true && envelope.name.toLowerCase().startsWith(opening),
    );
}

/** What a multiclass archetype adds: the class it is named after, or the gap when no class has its name. */
interface Multiclass {
  readonly data: object;
  readonly gaps: readonly KindDataGap[];
}

function multiclassOf(envelope: ImportedEnvelope, { references }: ArchetypeContext): Multiclass {
  const multiclass = resolveSlug(references, ContentKind.Class, asciiNameSlug(envelope.name));
  return multiclass === undefined
    ? {
        data: {},
        gaps: [
          {
            entry: envelope.id,
            reason: KindDataGapReason.UnresolvedReference,
            field: 'multiclass',
            raw: envelope.name,
          },
        ],
      }
    : { data: { multiclass }, gaps: [] };
}

/** The archetype entry's envelope: the page's name, introduction and UUID, with the dedication's rarity, source and licence. */
function envelopeOf(page: Page, dedication: ImportedEnvelope, context: ArchetypeContext): ImportedEnvelope | undefined {
  const { name: text, text: body } = page.page;
  const slug = EntrySlug.safeParse(`${ContentKind.Archetype}:${asciiNameSlug(text)}`);
  const name = ContentText.safeParse(text);
  if (!slug.success || !name.success) {
    return undefined;
  }
  const introduction = (body?.content ?? '').split(INTRODUCTION_END)[0] ?? '';
  return {
    id: ContentId.parse(contentId(context.pack, slug.data)),
    pack: context.pack,
    slug: slug.data,
    name: name.data,
    rarity: dedication.rarity,
    traits: [],
    sources: dedication.sources,
    description: htmlToRichText(introduction, context.links).richText,
    rules: [],
    ...(dedication.license === undefined ? {} : { license: dedication.license }),
    externalIds: { foundry: pageUuid(page) },
  };
}

function built(page: Page, context: ArchetypeContext): Built | undefined {
  const feats = linkedFeats(page.page.text?.content ?? '', context);
  const dedication = dedicationOf(page.page.name, feats, context);
  const envelope = dedication && envelopeOf(page, dedication, context);
  if (dedication === undefined || envelope === undefined) {
    return undefined;
  }
  const multiclass = dedication.traits.includes(MULTICLASS) ? multiclassOf(envelope, context) : { data: {}, gaps: [] };
  const data = { dedication: dedication.id, ...multiclass.data };
  return { entry: { envelope, kindData: { kind: ContentKind.Archetype, data } }, feats, gaps: multiclass.gaps };
}

/**
 * The archetypes whose dedication the import brings in, from the archetypes journal's pages, and the archetypes
 * each linked feat belongs to. A page whose dedication is outside the import is left for that book's import.
 */
export function importArchetypes(journals: readonly JournalDocument[], context: ArchetypeContext): Archetypes {
  const pages = journals
    .filter(({ journal }) => journal.name === ARCHETYPES_JOURNAL)
    .flatMap(({ journal }) => journal.pages.map((page) => ({ journal, page })));
  const archetypes = pages.flatMap((page) => built(page, context) ?? []);
  const byFeat = new Map<ContentId, ArchetypeLink[]>();
  for (const { entry, feats } of archetypes) {
    const dedication = context.envelopes.get(entry.kindData.data.dedication)?.name ?? entry.envelope.name;
    for (const feat of feats) {
      byFeat.set(feat, [...(byFeat.get(feat) ?? []), { archetype: entry.envelope.id, dedication }]);
    }
  }
  return { entries: archetypes.map(({ entry }) => entry), byFeat, gaps: archetypes.flatMap(({ gaps }) => gaps) };
}
