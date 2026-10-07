import { ContentNamespace, derivedId } from '@pioneer/shared/kernel';
import { z } from 'zod';

/**
 * Kebab-case identifier: lowercase alphanumerics separated by single hyphens.
 * Written with a lookahead instead of `(-[a-z\d]+)*` to keep it linear-time.
 */
export const SlugSchema = z.string().regex(/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/u);

/** Human-readable key for a content entry, e.g. `player-core/human`. Never stored. */
export function contentKey(packId: string, slug: string): string {
  return `${packId}/${slug}`;
}

/**
 * The stored id of a content entry: UUIDv5 of its key. Deterministic, so the
 * same book yields the same ids on server, client and in the database, with
 * no lookup table. Renaming a slug changes the id; treat slugs as permanent.
 */
export function contentId(packId: string, slug: string): string {
  return derivedId(ContentNamespace, contentKey(packId, slug));
}

/** A content pack's id: its slug, branded so it can't be confused with an entry slug. */
export const PackId = SlugSchema.brand<'PackId'>();
export type PackId = z.infer<typeof PackId>;
