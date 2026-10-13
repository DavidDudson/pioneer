import { PackVisibility } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';

import type { ReadablePack } from './pack-directory';
import type { PackEnablementDirectory } from './pack-enablement-directory';

/**
 * Who may read a homebrew pack (ADR-0007), the one place that decides it; every story that reads a pack asks here
 * instead of re-deriving it.
 *
 * - `private`: its owner.
 * - `campaign`: its owner, and members of campaigns that enable it.
 * - `public`: every signed-in user.
 *
 * Services treat a refusal as not found, so the ids of packs a user may not read reveal nothing.
 */
export class PackAccessPolicy {
  readonly #enablement: PackEnablementDirectory;

  public constructor(enablement: PackEnablementDirectory) {
    this.#enablement = enablement;
  }

  public async mayRead(actor: UserId, pack: ReadablePack): Promise<boolean> {
    if (PackAccessPolicy.owns(actor, pack)) {
      return true;
    }
    if (pack.visibility === PackVisibility.Public) {
      return true;
    }
    if (pack.visibility === PackVisibility.Campaign) {
      return this.#enablement.belongsToCampaignEnabling(actor, pack);
    }
    return false;
  }

  /** Only the owner changes a pack, however widely it is shared. */
  public static owns(actor: UserId, pack: ReadablePack): boolean {
    return pack.ownerId === actor;
  }
}
