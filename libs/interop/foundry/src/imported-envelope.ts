import type {
  BookId,
  ContentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  ExternalId,
  PackId,
  Rarity,
  RichText,
  RuleElement,
  SourceKind,
  Trait,
} from '@pioneer/rules/sdk';

/** The envelope fields the import fills, before kind `data` and pack output (content-model.md, "Foundry import"). */

export interface FoundryExternalIds {
  readonly foundry: ExternalId;
}

/**
 * A book source as the import knows it: the book, with no page or AoN link. `SourceRef` requires one of the two
 * (ADR-0005), so this is its own type until enrichment (#22) adds them; how pack output treats it is #400's call.
 */
export interface UnlocatedBookSource {
  readonly kind: typeof SourceKind.Book;
  readonly book: BookId;
}

/**
 * The envelope fields of `ContentEntry`, as the import fills them. Not parsed against `ContentEntry` here: kind
 * `data` is beside it, and its source is an `UnlocatedBookSource`.
 */
export interface EnvelopeFields {
  readonly id: ContentId;
  readonly pack: PackId;
  readonly slug: EntrySlug;
  readonly name: ContentText;
  readonly level?: ContentLevel;
  readonly rarity: Rarity;
  readonly traits: readonly Trait[];
  readonly sources: readonly UnlocatedBookSource[];
  readonly description: RichText;
  readonly rules: readonly RuleElement[];
}

/** The envelope of an entry translated from a Foundry document, which carries its compendium UUID. */
export interface ImportedEnvelope extends EnvelopeFields {
  readonly externalIds: FoundryExternalIds;
}
