import type { CharacterId, FeatDisplayChoice, SetFeatDisplayBody } from '@pioneer/character/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import type { FeatDisplayRepository } from './feat-display-repository';

/**
 * The sections where the acting user shows a character's grant-only feats, a display preference (ADR-0052). Only a
 * user who may access the character reads or sets one; anyone else gets the same 404 as for a missing character.
 */
export class FeatDisplayService {
  readonly #characters: CharacterRepository;
  readonly #display: FeatDisplayRepository;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, display: FeatDisplayRepository, clock: Clock) {
    this.#characters = characters;
    this.#display = display;
    this.#clock = clock;
  }

  public async get(actor: UserId, id: CharacterId): Promise<FeatDisplayChoice> {
    await this.#assertAccess(actor, id);
    return { showGrantOnly: await this.#display.findShown({ userId: actor, characterId: id }) };
  }

  public async set(
    actor: UserId,
    id: CharacterId,
    { section, showGrantOnly }: SetFeatDisplayBody,
  ): Promise<FeatDisplayChoice> {
    await this.#assertAccess(actor, id);
    const key = { userId: actor, characterId: id };
    await this.#display.save(key, { section, showGrantOnly }, this.#clock.now());
    return { showGrantOnly: await this.#display.findShown(key) };
  }

  async #assertAccess(actor: UserId, id: CharacterId): Promise<void> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
  }
}
