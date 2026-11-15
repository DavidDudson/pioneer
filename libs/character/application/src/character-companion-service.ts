import { CompanionId } from '@pioneer/character/domain';
import type {
  AddCompanionBody,
  ArchiveCompanionBody,
  CharacterCompanions,
  CharacterId,
  RestoreCompanionBody,
} from '@pioneer/character/domain';
import { newId, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CharacterCompanionRepository, CompanionWriteContext } from './character-companion-repository';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** One companion of one character. */
export interface CompanionRef {
  readonly character: CharacterId;
  readonly companion: CompanionId;
}

/** The ports `CharacterCompanionService` works through. */
export interface CharacterCompanionPorts {
  readonly characters: CharacterRepository;
  readonly companions: CharacterCompanionRepository;
}

/**
 * The companions a character owns (ADR-0079): a familiar now, later an animal companion or an eidolon. Only the owner
 * reads or changes them; anyone else gets a 404. Every write bumps the character's version in its own transaction, so
 * a build changed since the owner read it is a 409. Framework-free, like `CharacterItemApprovalService`.
 */
export class CharacterCompanionService {
  readonly #characters: CharacterRepository;
  readonly #companions: CharacterCompanionRepository;
  readonly #clock: Clock;

  public constructor({ characters, companions }: CharacterCompanionPorts, clock: Clock) {
    this.#characters = characters;
    this.#companions = companions;
    this.#clock = clock;
  }

  /** The character's live companions, then its archived ones. Not the owner: 404. */
  public async list(actor: UserId, id: CharacterId): Promise<CharacterCompanions> {
    await this.#owned(actor, id);
    return this.#view(id);
  }

  /** Adds a companion. A live one of the kind is held already: 409. */
  public async add(actor: UserId, id: CharacterId, body: AddCompanionBody): Promise<CharacterCompanions> {
    await this.#owned(actor, id);
    const context = this.#context(actor, id, body.expectedVersion);
    await this.#companions.add(context, {
      id: CompanionId.parse(newId()),
      kind: body.kind,
      name: body.name,
      form: body.form,
      grantedBy: body.grantedBy,
      createdAt: context.at,
      archived: undefined,
    });
    return this.#view(id);
  }

  /** Archives a live companion as replaced or released; one already archived is no change. */
  public async archive(
    actor: UserId,
    { character, companion }: CompanionRef,
    body: ArchiveCompanionBody,
  ): Promise<CharacterCompanions> {
    await this.#owned(actor, character);
    await this.#companions.archive(this.#context(actor, character, body.expectedVersion), {
      id: companion,
      reason: body.reason,
    });
    return this.#view(character);
  }

  /** Brings an archived companion back, unless another live one holds its kind's place: 409. */
  public async restore(
    actor: UserId,
    { character, companion }: CompanionRef,
    body: RestoreCompanionBody,
  ): Promise<CharacterCompanions> {
    await this.#owned(actor, character);
    await this.#companions.restore(this.#context(actor, character, body.expectedVersion), companion);
    return this.#view(character);
  }

  #context(
    actor: UserId,
    characterId: CharacterId,
    expectedVersion: CompanionWriteContext['expectedVersion'],
  ): CompanionWriteContext {
    return { actor, characterId, expectedVersion, at: this.#clock.now() };
  }

  /** One of the actor's characters. Another user's is a 404, the same as a missing one (ADR-0007). */
  async #owned(actor: UserId, id: CharacterId): Promise<void> {
    const character = await this.#characters.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
  }

  async #view(id: CharacterId): Promise<CharacterCompanions> {
    return { companions: await this.#companions.listForCharacter(id) };
  }
}
