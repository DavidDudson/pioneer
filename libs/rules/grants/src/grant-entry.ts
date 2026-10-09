import type { ContentId, ContentText, OriginHop, RuleElement, SourceRef } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/**
 * What grant resolution reads of a content entry: its name, its rule elements and its sources. Any kind of entry
 * (class, feat, feature, action, condition) has these, so grants follow one shape until the per-kind content
 * schemas land (Epic 2.1).
 */
export interface GrantEntry {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly rules: readonly RuleElement[];
  /** At least one, as every origin names its entry's sources. */
  readonly sources: readonly [SourceRef, ...SourceRef[]];
}

/** Finds a content entry by id; undefined when no installed pack has it. */
export type ContentLookup = (id: ContentId) => GrantEntry | undefined;

/**
 * Something the character has directly: an ancestry, class or feat the player picked, a condition or an effect.
 * `hop` is how it got there, and starts the origin of everything it grants.
 */
export interface GrantRoot {
  readonly entry: ContentId;
  readonly hop: OriginHop;
}

/** A grant that failed, and the hops down to the element that made it (or the root, for a root that failed). */
export interface GrantError {
  readonly error: MessageDescriptor;
  readonly hops: readonly OriginHop[];
}
