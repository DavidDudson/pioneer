import type {
  ContentEntry,
  ContentId,
  ContentKind,
  ContentLicense,
  ContentLevel,
  Level,
  ContentPackFile,
  ContentPackId,
  ContentText,
  PackId,
  PackVisibility,
  Rarity,
  Slug,
  Trait,
} from '@pioneer/rules/sdk';
import type { UserId, Uuid, Version } from '@pioneer/shared/kernel';
import { index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema for content storage (content-model.md, "Packs and storage"). Migrations live in apps/api/migrations.
 * The book registry is code, not a table (ADR-0024). The foreign key from `content_packs.owner_id` to users (on
 * delete cascade) is in migration 0011, not here: identity's tables are outside this context's module boundary.
 */
export const contentPacks = pgTable(
  'content_packs',
  {
    // UUIDv5 of the pack id (contentPackId), so every database agrees on it.
    id: uuid().$type<ContentPackId>().primaryKey(),
    // The pack id entries are keyed under (`player-core`); entry ids derive from it, so it is unique.
    slug: text().$type<PackId>().notNull().unique(),
    title: text().$type<ContentText>().notNull(),
    publisher: text().$type<ContentText>().notNull(),
    // Null for official packs; homebrew packs belong to the user who made them.
    ownerId: uuid().$type<UserId>(),
    visibility: text().$type<PackVisibility>().notNull(),
    license: text().$type<ContentLicense>().notNull(),
    // Goes up by one each time the pack's content changes.
    version: integer().$type<Version>().notNull(),
    // SHA-256 of the pack's canonical JSON (contentHash); the seed skips a pack whose hash hasn't changed.
    contentHash: text().notNull(),
    // The whole `pack.json`, pack-wide data such as the core rules pack's proficiency bonus table included.
    data: jsonb().$type<ContentPackFile>().notNull(),
    // Strings, not Date: Date is banned.
    updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  // Serves the cascade when the owner's user is deleted, and later a user's own packs.
  (table) => [index('content_packs_owner_id_idx').on(table.ownerId)],
);

/**
 * One row per content entry. `data` holds the whole `ContentEntry`, so a row reads back as the entry; the other
 * columns copy the envelope fields the content browser filters and sorts on.
 */
export const contentEntries = pgTable(
  'content_entries',
  {
    // UUIDv5 of `<pack>/<slug>` (contentId).
    id: uuid().$type<ContentId>().primaryKey(),
    packId: uuid()
      .$type<ContentPackId>()
      .notNull()
      .references(() => contentPacks.id, { onDelete: 'cascade' }),
    kind: text().$type<ContentKind>().notNull(),
    slug: text().$type<Slug>().notNull(),
    name: text().$type<ContentText>().notNull(),
    // A creature's level runs from -1; every other kind's from 0.
    level: smallint().$type<ContentLevel | Level>(),
    rarity: text().$type<Rarity>().notNull(),
    traits: text().array().$type<Trait[]>().notNull(),
    data: jsonb().$type<ContentEntry>().notNull(),
    updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    // A pack's entries by kind; also serves loading or clearing a whole pack.
    index('content_entries_pack_kind_idx').on(table.packId, table.kind),
    uniqueIndex('content_entries_pack_slug_idx').on(table.packId, table.slug),
    index('content_entries_traits_idx').using('gin', table.traits),
    index('content_entries_level_idx').on(table.level),
  ],
);

/** A homebrew pack that extends another pack, such as one adding feats to Player Core's classes. */
export const contentPackDeps = pgTable(
  'content_pack_deps',
  {
    // The audit log keys rows by id, so a dependency has its own; `(pack_id, depends_on)` is unique instead.
    id: uuid().$type<Uuid>().primaryKey(),
    packId: uuid()
      .$type<ContentPackId>()
      .notNull()
      .references(() => contentPacks.id, { onDelete: 'cascade' }),
    dependsOn: uuid()
      .$type<ContentPackId>()
      .notNull()
      .references(() => contentPacks.id),
  },
  (table) => [
    uniqueIndex('content_pack_deps_pack_depends_on_idx').on(table.packId, table.dependsOn),
    // Serves the foreign key check when a pack something depends on is deleted.
    index('content_pack_deps_depends_on_idx').on(table.dependsOn),
  ],
);
