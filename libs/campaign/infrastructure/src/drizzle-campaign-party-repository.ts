import { CampaignPartyRepository } from '@pioneer/campaign/application';
import type { CampaignCharacter, CampaignId, CharacterId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignCharacters, campaignMembers } from './campaign.table';

type CampaignCharacterRow = typeof campaignCharacters.$inferSelect;

function toCampaignCharacter(row: CampaignCharacterRow): CampaignCharacter {
  return {
    id: row.id,
    characterId: row.characterId,
    memberId: row.memberId,
    attachedAt: Temporal.Instant.from(row.attachedAt),
  };
}

export class DrizzleCampaignPartyRepository extends CampaignPartyRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignCharacter[]> {
    const rows = await this.#db
      .select()
      .from(campaignCharacters)
      .where(eq(campaignCharacters.campaignId, campaignId))
      .orderBy(asc(campaignCharacters.attachedAt), asc(campaignCharacters.id));
    return rows.map((row) => toCampaignCharacter(row));
  }

  public override async campaignsOf(
    characterIds: readonly CharacterId[],
  ): Promise<ReadonlyMap<CharacterId, CampaignId>> {
    if (characterIds.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select({ characterId: campaignCharacters.characterId, campaignId: campaignCharacters.campaignId })
      .from(campaignCharacters)
      .where(inArray(campaignCharacters.characterId, [...characterIds]));
    return new Map(rows.map((row) => [row.characterId, row.campaignId]));
  }

  public override async attach(campaignId: CampaignId, character: CampaignCharacter): Promise<CampaignId | undefined> {
    return this.#db.transaction(async (tx) => {
      // A key share lock holds off the member's removal until this commits, or sees it already gone.
      const [member] = await tx
        .select({ id: campaignMembers.id })
        .from(campaignMembers)
        .where(and(eq(campaignMembers.id, character.memberId), eq(campaignMembers.campaignId, campaignId)))
        .for('key share');
      if (member === undefined) {
        return undefined;
      }
      // Two attaches racing: the second waits on the unique index, then finds the first's row below.
      await tx
        .insert(campaignCharacters)
        .values({
          id: character.id,
          campaignId,
          memberId: character.memberId,
          characterId: character.characterId,
          attachedAt: character.attachedAt.toString(),
        })
        .onConflictDoNothing({ target: campaignCharacters.characterId });
      const [placed] = await tx
        .select({ campaignId: campaignCharacters.campaignId })
        .from(campaignCharacters)
        .where(eq(campaignCharacters.characterId, character.characterId));
      return placed?.campaignId;
    });
  }

  public override async detach(campaignId: CampaignId, characterId: CharacterId): Promise<void> {
    await this.#db
      .delete(campaignCharacters)
      .where(and(eq(campaignCharacters.campaignId, campaignId), eq(campaignCharacters.characterId, characterId)));
  }
}
