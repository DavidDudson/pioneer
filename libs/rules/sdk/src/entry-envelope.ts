import * as z from 'zod';

import { ContentId, PackId, Slug } from './content-id';
import { ContentText } from './content-text';
import { DisplayHints, ExternalIds, RaritySchema } from './entry-fields';
import { RichText } from './rich-text';
import { RuleElements } from './rule-element';
import { SourceRef } from './source-ref';
import { Trait } from './trait';
import { ContentLevel } from './units';

const TRAITS_MAX = 32;
const SOURCES_MAX = 8;
const SUPERSEDES_MAX = 8;

/** Where an entry lives; `kind` follows, then the rest of the envelope (content-model.md, "Content entry"). */
export const address = { id: ContentId, pack: PackId };

/** The fields every entry has after its kind, whatever the kind. */
export const envelope = {
  slug: Slug,
  name: ContentText,
  level: ContentLevel.optional(),
  rarity: RaritySchema,
  traits: z.array(Trait).max(TRAITS_MAX).readonly(),
  /** At least one (ADR-0005). */
  sources: z.array(SourceRef).min(1).max(SOURCES_MAX).readonly(),
  description: RichText,
  rules: RuleElements.readonly(),
  display: DisplayHints.optional(),
  externalIds: ExternalIds.optional(),
  /** Entries this one replaces, such as the legacy entry a remaster one supersedes. */
  supersedes: z.array(ContentId).max(SUPERSEDES_MAX).readonly().optional(),
};
