import type {
  ContentId,
  ContentLevel,
  ContentText,
  EntrySlug,
  ExternalId,
  Level,
  PackId,
  Rarity,
  RichText,
  RuleElement,
  SourceRef,
  Trait,
} from '@pioneer/rules/sdk';

/** The envelope fields the import fills, before kind `data` and pack output (content-model.md, "Foundry import"). */

export interface FoundryExternalIds {
  readonly foundry: ExternalId;
}

/**
 * The envelope fields of `ContentEntry`, as the import fills them. Not parsed against `ContentEntry` here: kind
 * `data` is beside it until pack output (`packOutput`) joins and validates them.
 */
export interface EnvelopeFields {
  readonly id: ContentId;
  readonly pack: PackId;
  readonly slug: EntrySlug;
  readonly name: ContentText;
  readonly level?: ContentLevel | Level;
  readonly rarity: Rarity;
  readonly traits: readonly Trait[];
  readonly sources: readonly SourceRef[];
  readonly description: RichText;
  readonly rules: readonly RuleElement[];
}

/** The envelope of an entry translated from a Foundry document, which carries its compendium UUID. */
export interface ImportedEnvelope extends EnvelopeFields {
  readonly externalIds: FoundryExternalIds;
}
