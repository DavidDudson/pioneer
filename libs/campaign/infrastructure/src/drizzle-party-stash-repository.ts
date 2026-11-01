import type { CampaignId, PartyStashDocument } from '@pioneer/campaign/domain';
import { nextVersion, Version, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignPartyStashes } from './campaign-party-stash.table';

/** Name the command on the audit row it writes, as a service use case names a command. */
const SAVE_COMMAND = 'save-campaign-party-stash';

const FIRST_VERSION = Version.parse(1);

/** The stash to save, and the version `load` returned for it, or none for a stash that did not exist. */
export interface PartyStashWrite {
  readonly campaignId: CampaignId;
  readonly document: PartyStashDocument;
  readonly expected: Version | undefined;
}

/** The stored stash and the version it was read at. */
export interface StoredPartyStash {
  readonly document: PartyStashDocument;
  readonly version: Version;
}

/**
 * Stores a campaign's party stash as the opaque inventory document it is. Built on a transaction by the adapter that
 * moves lines, so the stash and the character are written, or refused, together.
 */
export class DrizzlePartyStashRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;
  readonly #clock: Clock;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>, clock: Clock) {
    this.#db = db;
    this.#clock = clock;
  }

  /** The stash and its version; none while nothing has ever been put in it. */
  public async load(campaignId: CampaignId): Promise<StoredPartyStash | undefined> {
    const [row] = await this.#db
      .select({ document: campaignPartyStashes.document, version: campaignPartyStashes.version })
      .from(campaignPartyStashes)
      .where(eq(campaignPartyStashes.id, campaignId))
      .limit(1);
    return row;
  }

  /**
   * Saves the stash. A stash changed
   * (or made) since throws `VersionConflictError`.
   */
  public async save(actor: UserId, { campaignId, document, expected }: PartyStashWrite): Promise<void> {
    const updatedAt = this.#clock.now().toString();
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: SAVE_COMMAND });
      if (expected === undefined) {
        const made = await tx
          .insert(campaignPartyStashes)
          .values({ id: campaignId, document, version: FIRST_VERSION, updatedAt })
          .onConflictDoNothing()
          .returning({ id: campaignPartyStashes.id });
        if (made.length === 0) {
          throw new VersionConflictError('PartyStash', campaignId);
        }
        return;
      }
      const saved = await tx
        .update(campaignPartyStashes)
        .set({ document, version: nextVersion(expected), updatedAt })
        .where(and(eq(campaignPartyStashes.id, campaignId), eq(campaignPartyStashes.version, expected)))
        .returning({ id: campaignPartyStashes.id });
      if (saved.length === 0) {
        throw new VersionConflictError('PartyStash', campaignId);
      }
    });
  }
}
