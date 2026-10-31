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

/** The longest a Lore's topic may be: `skill:lore:<topic>` must stay a selector, which holds at most 128 characters. */
export const LORE_TOPIC_MAX = 64;

/** The longest a player's name for a Lore may be. */
export const LORE_NAME_MAX_LENGTH = 60;

/** What a pick of a Lore no loaded content names starts so: `lore:sailing`. */
export const LORE_CHOICE_PREFIX = 'lore:';

/** A pick of a custom-named Lore, by its topic (`lore:sailing`); the player's name for it is kept on the character. */
export const LoreChoice = z
  .string()
  .max(LORE_CHOICE_PREFIX.length + LORE_TOPIC_MAX)
  .regex(/^lore:[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/u)
  .brand<'LoreChoice'>();
export type LoreChoice = z.infer<typeof LoreChoice>;

/** A Lore's name as typed or listed, before it is folded to a topic. */
export const LoreText = z.string().brand<'LoreText'>();
export type LoreText = z.infer<typeof LoreText>;

const MARKS = /\p{Mark}/gu;
const NOT_ALPHANUMERIC = /[^a-z\d]+/gu;
const EDGE_HYPHENS = /^-+|-+$/gu;
const TRAILING_LORE = /\s+lore$/iu;

/**
 * A Lore's topic from a name typed or listed, less the word Lore its selector already says: `Sailing Lore`,
 * `sailing` and `Säiling!` are all `sailing`. Undefined when the name leaves no letters or digits, or a topic longer
 * than `LORE_TOPIC_MAX` (compatibility characters can expand to more than they were typed as).
 */
export function loreTopicSlug(name: LoreText): Slug | undefined {
  const topic = name
    .replace(TRAILING_LORE, '')
    .normalize('NFKD')
    .replaceAll(MARKS, '')
    .toLowerCase()
    .replaceAll(NOT_ALPHANUMERIC, '-')
    .replaceAll(EDGE_HYPHENS, '');
  return topic.length > LORE_TOPIC_MAX ? undefined : Slug.safeParse(topic).data;
}

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
