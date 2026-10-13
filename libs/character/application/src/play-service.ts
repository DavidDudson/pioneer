import {
  applyPlayCommand,
  characterStatisticInputs,
  characterStatistics,
  maxHitPoints,
  PLAY_COMMANDS,
  PlayCommandField,
  slotContent,
  withTempHitPoints,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterPlay,
  PatchPlayBody,
  PlayCommand,
  PlayState,
} from '@pioneer/character/domain';
import type { ContentSource, HitPoints } from '@pioneer/rules/sdk';
import { message, NotFoundError, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/**
 * A character's play state (#343): read and edited apart from its build, with its own revision, so a play edit never
 * bumps the character's version and a build save never writes play state. Only a user who may access the character
 * reads or edits it; anyone else gets the same 404 as for a missing character.
 */
export class PlayService {
  readonly #characters: CharacterRepository;
  readonly #content: ContentSource;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, content: ContentSource, clock: Clock) {
    this.#characters = characters;
    this.#content = content;
    this.#clock = clock;
  }

  public async get(actor: UserId, id: CharacterId): Promise<CharacterPlay> {
    await this.#accessible(actor, id);
    return this.#stored(id);
  }

  /**
   * One play edit, if the play state is still at `expectedRevision`. Hit Points are held within 0 and the maximum the
   * engine derives from the build and the server's content; a character with no maximum yet is refused.
   */
  public async patch(
    actor: UserId,
    id: CharacterId,
    { expectedRevision, command }: PatchPlayBody,
  ): Promise<CharacterPlay> {
    const character = await this.#accessible(actor, id);
    const current = await this.#stored(id);
    if (current.revision !== expectedRevision) {
      throw new VersionConflictError('CharacterPlay', id);
    }
    const play = await this.#applied(character, current.play, command);
    return this.#characters.updatePlay({
      id,
      play,
      expectedRevision,
      audit: { actor, command: PLAY_COMMANDS[command.field] },
      now: this.#clock.now(),
    });
  }

  /** Temporary Hit Points need no maximum, so a character without one can still gain them. */
  async #applied(character: Character, play: PlayState, command: PlayCommand): Promise<PlayState> {
    if (command.field === PlayCommandField.SetTempHp) {
      return withTempHitPoints(play, command.temp);
    }
    const max = await this.#maxHitPoints(character);
    return applyPlayCommand(play, command, max);
  }

  async #maxHitPoints(character: Character): Promise<HitPoints> {
    const registry = await this.#content.registry();
    const slots = slotContent(registry);
    const inputs = characterStatisticInputs(registry, character.document, slots);
    const max = maxHitPoints(characterStatistics(character.document, { registry, slots, inputs }));
    if (max === undefined) {
      throw new ValidationError([{ path: ['command'], message: message('character.validation.noMaxHitPoints') }]);
    }
    return max;
  }

  async #stored(id: CharacterId): Promise<CharacterPlay> {
    const stored = await this.#characters.findPlay(id);
    if (stored === undefined) {
      throw new NotFoundError('Character', id);
    }
    return stored;
  }

  async #accessible(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }
}
