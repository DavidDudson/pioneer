import { FlaggedItems } from '@pioneer/campaign/application';
import { FlaggedItem } from '@pioneer/campaign/domain';
import type { CampaignId } from '@pioneer/campaign/domain';
import { campaignCharacters } from '@pioneer/campaign/infrastructure';
import type { CharacterFlaggedItems, FlaggedLine } from '@pioneer/character/application';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { eq } from 'drizzle-orm';

import type { Database } from './database';

function toFlaggedItem(line: FlaggedLine): FlaggedItem {
  return FlaggedItem.parse(line);
}

/**
 * The campaign context's `FlaggedItems` over the character context: the rules the characters in a campaign's party
 * break, worked out on every read. An archived character is missing, as everywhere (ADR-0062). It lives in the
 * composition root because neither context may import the other.
 */
export class PartyFlaggedItems extends FlaggedItems {
  readonly #db: Database;
  readonly #characters: DrizzleCharacterRepository;
  readonly #flagged: CharacterFlaggedItems;

  public constructor(db: Database, flagged: CharacterFlaggedItems) {
    super();
    this.#db = db;
    this.#characters = new DrizzleCharacterRepository(db);
    this.#flagged = flagged;
  }

  public override async of(campaignId: CampaignId): Promise<readonly FlaggedItem[]> {
    const party = await this.#db
      .select({ characterId: campaignCharacters.characterId })
      .from(campaignCharacters)
      .where(eq(campaignCharacters.campaignId, campaignId))
      .orderBy(campaignCharacters.attachedAt, campaignCharacters.id);
    const found = await Promise.all(party.map(async (row) => this.#characters.findById(row.characterId)));
    const lines = await Promise.all(
      found.map(async (character) => (character === undefined ? [] : this.#flagged.of(character))),
    );
    return lines.flat().map((line) => toFlaggedItem(line));
  }
}
