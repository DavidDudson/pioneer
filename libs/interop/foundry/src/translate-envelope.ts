import {
  ContentId,
  contentId,
  ContentLevel,
  ContentText,
  ExternalId,
  Rarity,
  RaritySchema,
  Slug,
  SourceKind,
  Trait,
} from '@pioneer/rules/sdk';
import type { PackId, RichText, RuleElement, SourceRef } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { FoundryDocument } from './foundry-document';
import type { FoundryPack } from './foundry-release';
import { foundrySlug } from './foundry-slug';
import type { SelectedEntry } from './select-entries';
import { translateRules } from './translate-rules';
import type { UntranslatedRule } from './translate-rules';

/**
 * The entry envelope of each selected Foundry document (content-model.md, "Foundry import"): address, names,
 * traits, sources and rule elements. `description` stays empty until the rich text stories, and kind `data` is the
 * kind stories' (Epic 2.5). What cannot be translated is reported beside the envelopes, never dropped silently.
 */

/** The Pioneer pack the entries go into, and the traits Pioneer knows (its `trait` entries). */
export interface EnvelopeContext {
  readonly pack: PackId;
  readonly traits: ReadonlySet<Trait>;
}

export interface FoundryExternalIds {
  readonly foundry: ExternalId;
}

/**
 * The envelope fields of `ContentEntry`, as the import fills them. Not parsed against `ContentEntry` here: kind
 * `data` is missing, and a book source has no page or AoN link until enrichment (#22); pack output validates.
 */
export interface ImportedEnvelope {
  readonly id: ContentId;
  readonly pack: PackId;
  readonly slug: Slug;
  readonly name: ContentText;
  readonly level?: ContentLevel;
  readonly rarity: Rarity;
  readonly traits: readonly Trait[];
  readonly sources: readonly SourceRef[];
  readonly description: RichText;
  readonly rules: readonly RuleElement[];
  readonly externalIds: FoundryExternalIds;
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
  /** Its Foundry slug is not a Pioneer slug (an accented letter, say). */
  InvalidSlug: 'invalid-slug',
  InvalidName: 'invalid-name',
  /** `system.level.value` is outside a content entry's levels. */
  InvalidLevel: 'invalid-level',
  InvalidRarity: 'invalid-rarity',
  /** An earlier document (by archive path) has the same slug, so both would get the same id. */
  DuplicateSlug: 'duplicate-slug',
} as const;
export type EnvelopeFailureReason = ValueOf<typeof EnvelopeFailureReason>;

export interface EnvelopeFailure {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly reason: EnvelopeFailureReason;
  /** The value the reason is about. */
  readonly detail: string;
}

export interface EnvelopeTranslation {
  readonly entries: readonly TranslatedEntry[];
  readonly untranslatedRules: readonly UntranslatedRule[];
  readonly unknownTraits: readonly UnknownTrait[];
  readonly failures: readonly EnvelopeFailure[];
}

interface Translated {
  readonly envelope: ImportedEnvelope;
  readonly untranslatedRules: readonly UntranslatedRule[];
  readonly unknownTraits: readonly UnknownTrait[];
}

interface Failed {
  readonly reason: EnvelopeFailureReason;
  readonly detail: string;
}

const NO_DESCRIPTION: RichText = [];
const DEFAULT_RARITY: Rarity = Rarity.Common;

/** `Compendium.pf2e.<pack>.Item.<id>`, the UUID Foundry links a compendium item by. */
export function compendiumUuid(pack: FoundryPack, documentId: string): ExternalId {
  return ExternalId.parse(`Compendium.pf2e.${pack.name}.Item.${documentId}`);
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
  readonly slug: Slug;
  readonly name: ContentText;
  readonly level?: ContentLevel;
  readonly rarity: Rarity;
}

function failed(value: unknown): value is Failed {
  return typeof value === 'object' && value !== null && 'reason' in value;
}

function slugOf(document: FoundryDocument): Slug | Failed {
  const text = foundrySlug(document);
  const slug = Slug.safeParse(text);
  return slug.success ? slug.data : { reason: EnvelopeFailureReason.InvalidSlug, detail: text };
}

function nameOf({ name }: FoundryDocument): ContentText | Failed {
  const text = ContentText.safeParse(name);
  return text.success ? text.data : { reason: EnvelopeFailureReason.InvalidName, detail: name };
}

function levelOf({ system }: FoundryDocument): ContentLevel | Failed | undefined {
  const value = system.level?.value;
  const level = value === undefined ? undefined : ContentLevel.safeParse(value);
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
  readonly slug: Slug;
  readonly name: ContentText;
}

function identityOf(document: FoundryDocument): Identity | Failed {
  const slug = slugOf(document);
  const name = nameOf(document);
  if (failed(slug)) {
    return slug;
  }
  return failed(name) ? name : { slug, name };
}

/** The envelope's single-valued fields, or the first that fails. */
function scalars(document: FoundryDocument): Scalars | Failed {
  const identity = identityOf(document);
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

function translate(
  { pack: foundryPack, document, book }: SelectedEntry,
  context: EnvelopeContext,
): Translated | Failed {
  const fields = scalars(document);
  if (failed(fields)) {
    return fields;
  }
  const { _id: documentId, system } = document;
  const id = ContentId.parse(contentId(context.pack, fields.slug));
  const traits = translateTraits(id, system.traits?.value ?? [], context.traits);
  const rules = translateRules(id, system.rules);
  return {
    envelope: {
      id,
      pack: context.pack,
      ...fields,
      traits: traits.traits,
      sources: [{ kind: SourceKind.Book, book }],
      description: NO_DESCRIPTION,
      rules: rules.rules,
      externalIds: { foundry: compendiumUuid(foundryPack, documentId) },
    },
    untranslatedRules: rules.untranslated,
    unknownTraits: traits.unknown,
  };
}

interface Done extends Translated {
  readonly source: SelectedEntry;
}

/** `source` translated, or why not; claims its slug in `taken`. */
function outcome(source: SelectedEntry, context: EnvelopeContext, taken: Set<Slug>): Done | EnvelopeFailure {
  const { pack, path } = source;
  const result = translate(source, context);
  if (failed(result)) {
    return { pack, path, ...result };
  }
  const { slug } = result.envelope;
  if (taken.has(slug)) {
    return { pack, path, reason: EnvelopeFailureReason.DuplicateSlug, detail: slug };
  }
  taken.add(slug);
  return { source, ...result };
}

/**
 * Each selected document's envelope, in selection order, with what could not be translated. A document whose slug
 * an earlier one already took fails, since ids are UUIDv5 of `<pack>/<slug>` and must stay unique.
 */
export function translateEnvelopes(selected: readonly SelectedEntry[], context: EnvelopeContext): EnvelopeTranslation {
  const taken = new Set<Slug>();
  const outcomes = selected.map((source) => outcome(source, context, taken));
  const done = outcomes.filter((each): each is Done => !failed(each));
  return {
    entries: done.map(({ source, envelope }) => ({ source, envelope })),
    untranslatedRules: done.flatMap(({ untranslatedRules }) => untranslatedRules),
    unknownTraits: done.flatMap(({ unknownTraits }) => unknownTraits),
    failures: outcomes.filter((each) => failed(each)),
  };
}
