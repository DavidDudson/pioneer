import { ContentNamespace, derivedId, Uuid } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentKindSchema } from './content-kind';
import type { ContentKind } from './content-kind';

/**
 * Kebab-case identifier: lowercase alphanumerics separated by single hyphens.
 * Written with a lookahead instead of `(-[a-z\d]+)*` to keep it linear-time.
 */
const SLUG = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/u;

/** Kebab-case identifier, e.g. `human`: an entry's name within its kind, a pack id, a trait. */
export const Slug = z.string().regex(SLUG).brand<'Slug'>();
export type Slug = z.infer<typeof Slug>;

/** Separates an entry slug's kind from its name. */
const KIND_SEPARATOR = ':';

/**
 * Slug of a content entry: its kind and its name within the kind, `ancestry:human`, `trait:goblin`. Every kind is
 * named the same way, so entries of different kinds never share a slug or an id (`trait:goblin`, `language:goblin`).
 */
export const EntrySlug = z
  .string()
  .refine((text) => {
    const [kind, name, ...rest] = text.split(KIND_SEPARATOR);
    return rest.length === 0 && ContentKindSchema.safeParse(kind).success && name !== undefined && SLUG.test(name);
  })
  .brand<'EntrySlug'>();
export type EntrySlug = z.infer<typeof EntrySlug>;

/** The entry slug of a name within a kind: `entrySlug('ancestry', 'human')` is `ancestry:human`. */
export function entrySlug(kind: ContentKind, name: Slug): EntrySlug {
  return EntrySlug.parse(`${kind}${KIND_SEPARATOR}${name}`);
}

/** The kind part of an entry slug (`ancestry` of `ancestry:human`). */
export function slugKind(slug: EntrySlug): ContentKind {
  return ContentKindSchema.parse(slug.slice(0, slug.indexOf(KIND_SEPARATOR)));
}

/** The name part of an entry slug (`human` of `ancestry:human`). */
export function slugName(slug: EntrySlug): Slug {
  return Slug.parse(slug.slice(slug.indexOf(KIND_SEPARATOR) + 1));
}

/** A content pack's id: its slug, branded so it can't be confused with an entry slug. */
export const PackId = Slug.brand<'PackId'>();
export type PackId = z.infer<typeof PackId>;

/**
 * The stored id of any content entry, whatever its kind. Kind-specific ids (`AncestryId`) brand
 * `Uuid` themselves; use this where any entry will do (an origin, a grant).
 */
export const ContentId = Uuid.brand<'ContentId'>();
export type ContentId = z.infer<typeof ContentId>;

/** Human-readable key for a content entry, e.g. `player-core/ancestry:human`. Never stored. */
export const ContentKey = z.string().brand<'ContentKey'>();
export type ContentKey = z.infer<typeof ContentKey>;

export function contentKey(packId: PackId, slug: EntrySlug): ContentKey {
  return ContentKey.parse(`${packId}/${slug}`);
}

/**
 * The stored id of a content entry: UUIDv5 of its key. Deterministic, so the
 * same book yields the same ids on server, client and in the database, with
 * no lookup table. Renaming a slug changes the id; treat slugs as permanent.
 */
export function contentId(packId: PackId, slug: EntrySlug): Uuid {
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
