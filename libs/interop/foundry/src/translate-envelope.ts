import {
  ContentId,
  contentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  ExternalId,
  Level,
  Rarity,
  RaritySchema,
  SourceKind,
  Trait,
} from '@pioneer/rules/sdk';
import type { PackId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { describeEntries } from './describe-entries';
import type { UnknownMarkup, UntranslatedEnricher } from './describe-entries';
import type { EntryReferences } from './entry-references';
import { entrySlugOf } from './entry-slugs';
import { FoundryItemType } from './foundry-document';
import type { FoundryDocument } from './foundry-document';
import type { UnresolvedText } from './foundry-lang';
import { actorUuid, itemUuid } from './foundry-links';
import type { FoundryLang, FoundryPack, PackDocument } from './foundry-release';
import type { ImportedEnvelope } from './imported-envelope';
import type { SelectedEntry } from './select-entries';
import { translateRules } from './translate-rules';
import type { UntranslatedRule } from './translate-rules';
import type { FoundrySenses } from './translate-senses';
import type { DroppedRule } from './translate-token-rules';

/**
 * The entry envelope of each selected Foundry document (content-model.md, "Foundry import"): address, names,
 * traits, sources, description and rule elements; kind `data` is the kind stories' (Epic 2.5). What cannot be
 * translated is reported beside the envelopes, never dropped silently. Descriptions are a second pass: their links
 * resolve once every selected document has an id.
 */

/**
 * The Pioneer pack the entries go into, the traits Pioneer knows (its `trait` entries), Foundry's English lang
 * table, and how references to other documents resolve.
 */
export interface EnvelopeContext {
  readonly pack: PackId;
  readonly traits: ReadonlySet<Trait>;
  readonly lang: FoundryLang;
  /** The release's item documents, naming link targets outside the import; without them such links read as labels. */
  readonly documents?: readonly PackDocument[];
  readonly references?: EntryReferences;
  /** What each Foundry sense fixes, for the `Sense` elements (`RuleContext`). */
  readonly senses?: FoundrySenses;
}

export interface TranslatedEntry {
  readonly source: SelectedEntry;
  readonly envelope: ImportedEnvelope;
}

/** A trait outside Pioneer's vocabulary. Kept on the entry when it is a valid trait slug, dropped otherwise. */
export interface UnknownTrait {
  readonly entry: ContentId;
  readonly trait: string;
}

/** Why a selected document yields no entry. */
export const EnvelopeFailureReason = {
  /** Its slug, diacritics folded, is still not a Pioneer slug (a symbol Foundry keeps, say). */
  InvalidSlug: 'invalid-slug',
  InvalidName: 'invalid-name',
  /** `system.level.value` is outside a content entry's levels. */
  InvalidLevel: 'invalid-level',
  InvalidRarity: 'invalid-rarity',
  /** An earlier document of the same kind has the same name, so both would get the same id. */
  DuplicateSlug: 'duplicate-slug',
} as const;
export type EnvelopeFailureReason = ValueOf<typeof EnvelopeFailureReason>;

export interface EnvelopeFailure {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly reason: EnvelopeFailureReason;
  /** The document, kept so a backlog can carry it. */
  readonly document: FoundryDocument;
  /** The value the reason is about. */
  readonly detail: string;
}

export interface EnvelopeTranslation {
  readonly entries: readonly TranslatedEntry[];
  readonly untranslatedRules: readonly UntranslatedRule[];
  /** Rule elements dropped on purpose (they only change a Foundry token), apart from the untranslated ones. */
  readonly droppedRules: readonly DroppedRule[];
  readonly unknownTraits: readonly UnknownTrait[];
  readonly unknownMarkup: readonly UnknownMarkup[];
  readonly untranslatedEnrichers: readonly UntranslatedEnricher[];
  /** Lang keys in rule elements and descriptions with no English text, left out of the text. */
  readonly unresolvedText: readonly UnresolvedText[];
  readonly failures: readonly EnvelopeFailure[];
}

/** An envelope before its description, which waits for every entry's id. */
type Draft = Omit<ImportedEnvelope, 'description'>;

interface Translated {
  readonly envelope: Draft;
  readonly untranslatedRules: readonly UntranslatedRule[];
  /** Rule elements dropped on purpose (they only change a Foundry token), apart from the untranslated ones. */
  readonly droppedRules: readonly DroppedRule[];
  readonly unknownTraits: readonly UnknownTrait[];
  readonly unresolvedText: readonly UnresolvedText[];
}

interface Failed {
  readonly reason: EnvelopeFailureReason;
  readonly detail: string;
}

const DEFAULT_RARITY: Rarity = Rarity.Common;

/** `Compendium.pf2e.<pack>.Item.<id>`, the UUID Foundry links a compendium item by; `Actor` for a creature. */
export function compendiumUuid(pack: FoundryPack, documentId: string, type?: string): ExternalId {
  return ExternalId.parse(type === FoundryItemType.Npc ? actorUuid(pack, documentId) : itemUuid(pack, documentId));
}

interface TraitTranslation {
  readonly traits: readonly Trait[];
  readonly unknown: readonly UnknownTrait[];
}

function translateTraits(entry: ContentId, values: readonly string[], known: ReadonlySet<Trait>): TraitTranslation {
  const traits: Trait[] = [];
  const unknown: UnknownTrait[] = [];
  for (const value of new Set(values)) {
    const trait = Trait.safeParse(value);
    if (trait.success) {
      traits.push(trait.data);
    }
    if (!trait.success || !known.has(trait.data)) {
      unknown.push({ entry, trait: value });
    }
  }
  return { traits, unknown };
}

interface Scalars {
  readonly slug: EntrySlug;
  readonly name: ContentText;
  readonly level?: ContentLevel | Level;
  readonly rarity: Rarity;
}

function failed(value: unknown): value is Failed {
  return typeof value === 'object' && value !== null && 'reason' in value;
}

function slugOf(text: string): EntrySlug | Failed {
  const slug = EntrySlug.safeParse(text);
  return slug.success ? slug.data : { reason: EnvelopeFailureReason.InvalidSlug, detail: text };
}

function nameOf({ name }: FoundryDocument): ContentText | Failed {
  const text = ContentText.safeParse(name);
  return text.success ? text.data : { reason: EnvelopeFailureReason.InvalidName, detail: name };
}

/** A creature's level runs from -1 to 25; every other kind's from 0 to 30. */
function levelOf({ system, type }: FoundryDocument): ContentLevel | Level | Failed | undefined {
  const value = system.level?.value;
  const schema = type === FoundryItemType.Npc ? Level : ContentLevel;
  const level = value === undefined ? undefined : schema.safeParse(value);
  if (level?.success === false) {
    return { reason: EnvelopeFailureReason.InvalidLevel, detail: String(value) };
  }
  return level?.data;
}

function rarityOf({ system }: FoundryDocument): Rarity | Failed {
  const value = system.traits?.rarity ?? DEFAULT_RARITY;
  const rarity = RaritySchema.safeParse(value);
  return rarity.success ? rarity.data : { reason: EnvelopeFailureReason.InvalidRarity, detail: value };
}

interface Identity {
  readonly slug: EntrySlug;
  readonly name: ContentText;
}

function identityOf(document: FoundryDocument, slugText: string): Identity | Failed {
  const slug = slugOf(slugText);
  const name = nameOf(document);
  if (failed(slug)) {
    return slug;
  }
  return failed(name) ? name : { slug, name };
}

/** The envelope's single-valued fields, or the first that fails. */
function scalars(document: FoundryDocument, slugText: string): Scalars | Failed {
  const identity = identityOf(document, slugText);
  const level = levelOf(document);
  const rarity = rarityOf(document);
  if (failed(identity)) {
    return identity;
  }
  if (failed(level)) {
    return level;
  }
  return failed(rarity) ? rarity : { ...identity, rarity, ...(level === undefined ? {} : { level }) };
}

/** A selected document and the slug `entrySlugs` gave it. */
interface Slugged {
  readonly source: SelectedEntry;
  readonly slug: string;
}

function translate({ source, slug }: Slugged, context: EnvelopeContext): Translated | Failed {
  const { pack: foundryPack, document, book } = source;
  const fields = scalars(document, slug);
  if (failed(fields)) {
    return fields;
  }
  const { _id: documentId, system } = document;
  const id = ContentId.parse(contentId(context.pack, fields.slug));
  const traits = translateTraits(id, system.traits?.value ?? [], context.traits);
  const { references, lang, senses } = context;
  const rules = translateRules(id, system.rules, {
    lang,
    values: { item: document.name },
    ...(references === undefined ? {} : { references }),
    ...(senses === undefined ? {} : { senses }),
  });
  return {
    envelope: {
      id,
      pack: context.pack,
      ...fields,
      traits: traits.traits,
      sources: [{ kind: SourceKind.Book, book }],
      ...(source.license === undefined ? {} : { license: source.license }),
      rules: rules.rules,
      externalIds: { foundry: compendiumUuid(foundryPack, documentId, document.type) },
    },
    untranslatedRules: rules.untranslated,
    droppedRules: rules.dropped,
    unknownTraits: traits.unknown,
    unresolvedText: rules.unresolvedText,
  };
}

interface Done extends Translated {
  readonly source: SelectedEntry;
}

/** The document translated, or why not, with the document kept for the backlog; claims its slug in `taken`. */
function outcome(slugged: Slugged, context: EnvelopeContext, taken: Set<EntrySlug>): Done | EnvelopeFailure {
  const { source } = slugged;
  const { pack, path, document } = source;
  const result = translate(slugged, context);
  if (failed(result)) {
    return { pack, path, document, ...result };
  }
  const { slug } = result.envelope;
  if (taken.has(slug)) {
    return { pack, path, document, reason: EnvelopeFailureReason.DuplicateSlug, detail: slug };
  }
  taken.add(slug);
  return { source, ...result };
}

/**
 * Each selected document's envelope, in selection order, with what could not be translated. Slugs come from
 * `entrySlugs`; a document whose slug is taken (two of one kind and name) fails, since ids are UUIDv5 of
 * `<pack>/<slug>` and must stay unique.
 */
export function translateEnvelopes(selected: readonly SelectedEntry[], context: EnvelopeContext): EnvelopeTranslation {
  const taken = new Set<EntrySlug>();
  const outcomes = selected.map((source) => outcome({ source, slug: entrySlugOf(source) }, context, taken));
  const done = outcomes.filter((each): each is Done => !failed(each));
  const { descriptions, unknownMarkup, untranslatedEnrichers, unresolvedText } = describeEntries(
    done.map(({ source, envelope }) => ({ source, id: envelope.id })),
    context.documents ?? [],
    { lang: context.lang, known: context.references?.byUuid },
  );
  return {
    entries: done.map(({ source, envelope }) => ({
      source,
      envelope: { ...envelope, description: descriptions.get(envelope.id) ?? [] },
    })),
    untranslatedRules: done.flatMap(({ untranslatedRules }) => untranslatedRules),
    droppedRules: done.flatMap(({ droppedRules }) => droppedRules),
    unknownTraits: done.flatMap(({ unknownTraits }) => unknownTraits),
    unknownMarkup,
    untranslatedEnrichers,
    unresolvedText: [...done.flatMap((each) => each.unresolvedText), ...unresolvedText],
    failures: outcomes.filter((each) => failed(each)),
  };
}
