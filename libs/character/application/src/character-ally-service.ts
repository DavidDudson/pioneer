import type { Character, CharacterAllies, CharacterId } from '@pioneer/character/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import type { AttachedCampaignPacks } from './attached-campaign-packs';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** The ports `CharacterAllyService` works through. */
export interface CharacterAllyPorts {
  readonly characters: CharacterRepository;
  readonly campaigns: AttachedCampaignPacks;
}

/**
 * The party a character can name as the giver of an effect: the other characters in its campaign. Only the owner
 * reads it. A character in no campaign has no allies, and the sheet falls back to a typed name.
 */
export class CharacterAllyService {
  readonly #characters: CharacterRepository;
  readonly #campaigns: AttachedCampaignPacks;

  public constructor({ characters, campaigns }: CharacterAllyPorts) {
    this.#characters = characters;
    this.#campaigns = campaigns;
  }

  /** The character's allies by name. Not the owner: 404, the same as a missing character (ADR-0007). */
  public async allies(actor: UserId, id: CharacterId): Promise<CharacterAllies> {
    const character = await this.#owned(actor, id);
    const [campaign, allies] = await Promise.all([
      this.#campaigns.of(character.id),
      this.#campaigns.alliesOf(character.id),
    ]);
    return {
      ...(campaign === undefined ? {} : { campaign: campaign.name }),
      allies: allies.toSorted((left, right) => left.name.localeCompare(right.name)),
    };
  }

  async #owned(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }
}
