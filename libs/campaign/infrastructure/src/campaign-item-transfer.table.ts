import type {
  CampaignId,
  CharacterId,
  ItemTransferId,
  OfferedCoinAmount,
  ReviewedItemId,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { Version } from '@pioneer/shared/kernel';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import { campaigns } from './campaign.table';

/**
 * An offer of one inventory line, or of coins, from one campaign character to another (ADR-0064). It stays with the giver
 * until the offer is accepted; an answered or withdrawn offer keeps its row as history. The giver's character version is
 * kept so accepting can tell the giver changed since. The foreign keys to the characters (restrict: characters are
 * archived, never deleted) are in migration 0039, not here: the character context's tables are outside this context's
 * module boundary.
 */
export const campaignItemTransfers = pgTable(
  'campaign_item_transfers',
  {
    id: uuid().$type<ItemTransferId>().primaryKey(),
    campaignId: uuid()
      .$type<CampaignId>()
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    fromCharacterId: uuid().$type<CharacterId>().notNull(),
    toCharacterId: uuid().$type<CharacterId>().notNull(),
    // An item offer names its line and has no coins; a coin offer is the other way round (check constraint, migration 0040).
    itemId: uuid().$type<ReviewedItemId>(),
    platinum: integer().$type<OfferedCoinAmount>(),
    gold: integer().$type<OfferedCoinAmount>(),
    silver: integer().$type<OfferedCoinAmount>(),
    copper: integer().$type<OfferedCoinAmount>(),
    giverVersion: integer().$type<Version>().notNull(),
    status: text().$type<TransferStatus>().notNull(),
    createdAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    // Serves a campaign's pending offers, which order by creation; also the cascade when the campaign is deleted.
    index('campaign_item_transfers_campaign_idx').on(table.campaignId, table.createdAt),
    // Serve the foreign key checks on the characters; the giver's is not served by the partial unique index below.
    index('campaign_item_transfers_from_idx').on(table.fromCharacterId),
    index('campaign_item_transfers_to_idx').on(table.toCharacterId),
    // One pending offer per line: the service checks first, this stops two racing offers of the same line.
    uniqueIndex('campaign_item_transfers_pending_item_idx')
      .on(table.fromCharacterId, table.itemId)
      .where(sql`${table.status} = 'pending'`),
    // Exactly one kind: a line, or all four coin counts.
    check(
      'campaign_item_transfers_kind_check',
      sql`(${table.itemId} is not null and ${table.platinum} is null and ${table.gold} is null and ${table.silver} is null and ${table.copper} is null) or (${table.itemId} is null and ${table.platinum} >= 0 and ${table.gold} >= 0 and ${table.silver} >= 0 and ${table.copper} >= 0 and ${table.platinum} is not null and ${table.gold} is not null and ${table.silver} is not null and ${table.copper} is not null)`,
    ),
  ],
);
