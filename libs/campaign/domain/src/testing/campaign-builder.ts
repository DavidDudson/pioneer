import { derivedId, FixtureNamespace, fixedClock, UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';

import { Campaign } from '../campaign';
import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from '../campaign-fields';

/** GM of fixtures unless `ranBy` says otherwise; same id in every run. */
export const fixtureGmId: UserId = UserId.parse(derivedId(FixtureNamespace, 'user:Amiri'));

/**
 * Test builder for campaigns. Ids are UUIDv5 of the name (and member), so a fixture named
 * "Abomination Vaults" has the same ids in every test run.
 *
 * ```ts
 * const vaults = new CampaignBuilder().named('Abomination Vaults').withPlayer(ezren).build();
 * ```
 */
export class CampaignBuilder {
  #name: CampaignName = CampaignName.parse('Abomination Vaults');
  #gmId: UserId = fixtureGmId;
  #players: UserId[] = [];
  #at: Temporal.Instant = fixedClock('2026-01-01T00:00:00Z').now();

  public named(name: string): this {
    this.#name = CampaignName.parse(name);
    return this;
  }

  public ranBy(gmId: UserId): this {
    this.#gmId = gmId;
    return this;
  }

  /** Adds a player, joining a second after the one added before (the GM joins first). */
  public withPlayer(userId: UserId): this {
    this.#players = [...this.#players, userId];
    return this;
  }

  public createdAt(instant: Temporal.Instant): this {
    this.#at = instant;
    return this;
  }

  public build(): Campaign {
    const memberId = (userId: UserId): CampaignMemberId =>
      CampaignMemberId.parse(derivedId(FixtureNamespace, `campaign-member:${this.#name}:${userId}`));
    const created = Campaign.create({
      id: CampaignId.parse(derivedId(FixtureNamespace, `campaign:${this.#name}`)),
      gmMemberId: memberId(this.#gmId),
      gmId: this.#gmId,
      name: this.#name,
      now: this.#at,
    });
    const players = this.#players.map((userId, index) => ({
      id: memberId(userId),
      userId,
      role: CampaignRole.Player,
      joinedAt: this.#at.add({ seconds: index + 1 }),
    }));
    return new Campaign({
      id: created.id,
      version: created.version,
      name: created.name,
      gmId: created.gmId,
      members: [...created.members, ...players],
      createdAt: created.createdAt,
    });
  }
}
