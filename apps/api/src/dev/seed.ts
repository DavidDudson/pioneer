import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from '@pioneer/campaign/domain';
import { campaignMembers, campaigns } from '@pioneer/campaign/infrastructure';
import { DEV_USERS, DevUser } from '@pioneer/identity/dev-users';
import { users } from '@pioneer/identity/infrastructure';
import { FIRST_VERSION } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/** The campaign the dev users share: the GM runs it, both players are in it. Fixed ids so a reseed finds it. */
const DEV_CAMPAIGN = {
  id: CampaignId.parse('00000000-0000-4000-8000-00000000dc01'),
  name: CampaignName.parse('Dev Campaign'),
  members: [
    { id: CampaignMemberId.parse('00000000-0000-4000-8000-00000000dc11'), user: DevUser.Gm, role: CampaignRole.Gm },
    {
      id: CampaignMemberId.parse('00000000-0000-4000-8000-00000000dc12'),
      user: DevUser.PlayerOne,
      role: CampaignRole.Player,
    },
    {
      id: CampaignMemberId.parse('00000000-0000-4000-8000-00000000dc13'),
      user: DevUser.PlayerTwo,
      role: CampaignRole.Player,
    },
  ],
} as const;

/**
 * Seeds the local database with the dev users and their campaign. Idempotent: rows that already exist are left
 * as they are, so a reseed keeps whatever was changed through the app. Only the dev entrypoint calls it.
 */
export async function seedDevData(db: BunSQLDatabase<Record<string, unknown>>, clock: Clock): Promise<void> {
  const now = clock.now().toString();
  await db.transaction(async (tx) => {
    await tx
      .insert(users)
      .values(
        DEV_USERS.map(({ id, displayName }) => ({
          id,
          displayName,
          emailVerified: false,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoNothing();
    await tx
      .insert(campaigns)
      .values({
        id: DEV_CAMPAIGN.id,
        version: FIRST_VERSION,
        name: DEV_CAMPAIGN.name,
        gmId: DevUser.Gm.id,
        createdAt: now,
      })
      .onConflictDoNothing();
    await tx
      .insert(campaignMembers)
      .values(
        DEV_CAMPAIGN.members.map(({ id, user, role }) => ({
          id,
          campaignId: DEV_CAMPAIGN.id,
          userId: user.id,
          role,
          joinedAt: now,
        })),
      )
      .onConflictDoNothing();
  });
}
