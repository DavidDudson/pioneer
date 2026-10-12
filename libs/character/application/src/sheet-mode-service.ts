import type { CharacterId, SetSheetModeBody, SheetModeChoice } from '@pioneer/character/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import type { SheetModeRepository } from './sheet-mode-repository';

/**
 * The tab the acting user last had open on a character's sheet, a display preference (ADR-0013). Only a user who may
 * access the character reads or sets one; anyone else gets the same 404 as for a missing character.
 */
export class SheetModeService {
  readonly #characters: CharacterRepository;
  readonly #modes: SheetModeRepository;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, modes: SheetModeRepository, clock: Clock) {
    this.#characters = characters;
    this.#modes = modes;
    this.#clock = clock;
  }

  public async get(actor: UserId, id: CharacterId): Promise<SheetModeChoice> {
    await this.#assertAccess(actor, id);
    const mode = await this.#modes.findFor({ userId: actor, characterId: id });
    return mode === undefined ? {} : { mode };
  }

  public async set(actor: UserId, id: CharacterId, { mode }: SetSheetModeBody): Promise<SheetModeChoice> {
    await this.#assertAccess(actor, id);
    await this.#modes.save({ userId: actor, characterId: id }, mode, this.#clock.now());
    return { mode };
  }

  async #assertAccess(actor: UserId, id: CharacterId): Promise<void> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
  }
}
