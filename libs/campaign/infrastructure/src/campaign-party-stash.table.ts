import type { CampaignId, PartyStashDocument } from '@pioneer/campaign/domain';
import type { Version } from '@pioneer/shared/kernel';
import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

import { campaigns } from './campaign.table';

/**
 * What a campaign's party holds in common (ADR-0064): one row per campaign, made when the first line goes in. `document`
 * is an inventory the character context owns the shape of, so lines move in and out with the rules of a character's
 * own (`giveLine`); the campaign context stores it without reading it. It belongs to no character, so what it holds adds
 * Bulk to no one. `id` is the campaign's own id, the key the audit trigger reads. `version` is the optimistic lock a
 * deposit or take checks, with the character's, in one transaction.
 */
export const campaignPartyStashes = pgTable('campaign_party_stashes', {
  id: uuid()
    .$type<CampaignId>()
    .primaryKey()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  document: jsonb().$type<PartyStashDocument>().notNull(),
  version: integer().$type<Version>().notNull(),
  updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
});
