import type {
  CharacterId,
  CompanionArchiveReason,
  CompanionForm,
  CompanionId,
  CompanionName,
} from '@pioneer/character/domain';
import type { CompanionKind, SlotKey } from '@pioneer/rules/sdk';
import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { characters } from './character.table';

/**
 * A creature that follows a character (ADR-0079): a familiar now, later an animal companion or an eidolon. Its
 * statistics are derived from the master and never stored. Replacing or releasing it archives the row (ADR-0062).
 * Migrations are hand-edited for `archive.protect` and `audit.enable`.
 */
export const characterCompanions = pgTable(
  'character_companions',
  {
    id: uuid().$type<CompanionId>().primaryKey(),
    characterId: uuid()
      .$type<CharacterId>()
      .notNull()
      .references(() => characters.id, { onDelete: 'restrict' }),
    kind: text().$type<CompanionKind>().notNull(),
    name: text().$type<CompanionName>().notNull(),
    // Its shape depends on the kind: open for a familiar, `{ species }` for an animal companion.
    form: jsonb().$type<CompanionForm>().notNull(),
    grantedBy: text().$type<SlotKey>().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
    archivedAt: timestamp({ withTimezone: true, mode: 'string' }),
    archiveReason: text().$type<CompanionArchiveReason>(),
  },
  (table) => [
    // One live familiar per character; an archived one no longer holds the place.
    // An animal companion has no such index: a Beastmaster holds up to four, and the write holds that cap (ADR-0080).
    uniqueIndex('character_companions_live_kind_idx')
      .on(table.characterId, table.kind)
      .where(sql`${table.archivedAt} is null and ${table.kind} = 'familiar'`),
    // Serves the character's companions, newest first.
    index('character_companions_character_idx').on(table.characterId, table.createdAt, table.id),
  ],
);
