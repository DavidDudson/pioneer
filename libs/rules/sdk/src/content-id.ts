import { ContentNamespace, derivedId, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * Kebab-case identifier: lowercase alphanumerics separated by single hyphens.
 * Written with a lookahead instead of `(-[a-z\d]+)*` to keep it linear-time.
 */
const SLUG = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/u;

/** Slug of a content entry within its pack, e.g. `human`. */
export const Slug = z.string().regex(SLUG).brand<'Slug'>();
export type Slug = z.infer<typeof Slug>;

/** A content pack's id: its slug, branded so it can't be confused with an entry slug. */
export const PackId = Slug.brand<'PackId'>();
export type PackId = z.infer<typeof PackId>;

/**
 * The stored id of any content entry, whatever its kind. Kind-specific ids (`AncestryId`) brand
 * `Uuid` themselves; use this where any entry will do (an origin, a grant).
 */
export const ContentId = Uuid.brand<'ContentId'>();
export type ContentId = z.infer<typeof ContentId>;

/** Human-readable key for a content entry, e.g. `player-core/human`. Never stored. */
export const ContentKey = z.string().brand<'ContentKey'>();
export type ContentKey = z.infer<typeof ContentKey>;

export function contentKey(packId: PackId, slug: Slug): ContentKey {
  return ContentKey.parse(`${packId}/${slug}`);
}

/**
 * The stored id of a content entry: UUIDv5 of its key. Deterministic, so the
 * same book yields the same ids on server, client and in the database, with
 * no lookup table. Renaming a slug changes the id; treat slugs as permanent.
 */
export function contentId(packId: PackId, slug: Slug): Uuid {
  return derivedId(ContentNamespace, contentKey(packId, slug));
}

/** The stored id of a content pack, whatever its owner. */
export const ContentPackId = Uuid.brand<'ContentPackId'>();
export type ContentPackId = z.infer<typeof ContentPackId>;

/**
 * The stored id of a pack: UUIDv5 of its `PackId`, as `contentId` is of an entry's key. A key always holds a `/` and
 * a pack id never does, so a pack's id never equals an entry's.
 */
export function contentPackId(packId: PackId): ContentPackId {
  return ContentPackId.parse(derivedId(ContentNamespace, packId));
}
