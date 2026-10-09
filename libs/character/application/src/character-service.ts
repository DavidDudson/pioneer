import { Character, CharacterId, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterListQuery, CreateCharacterBody, PatchCharacterBody } from '@pioneer/character/domain';
import type { AncestryId, ContentRegistry } from '@pioneer/rules/sdk';
import { message, newId, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/**
 * Character use cases. Framework-free: the HTTP adapter calls these with the signed-in user as
 * `actor`. Every use case applies the access policy here, never in routes.
 */
export class CharacterService {
  readonly #repository: CharacterRepository;
  readonly #content: ContentRegistry;
  readonly #clock: Clock;

  public constructor(repository: CharacterRepository, content: ContentRegistry, clock: Clock) {
    this.#repository = repository;
    this.#content = content;
    this.#clock = clock;
  }

  /** The actor's own characters; nobody else's are listed. */
  public async list(actor: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    return this.#repository.listForOwner(actor, query);
  }

  /** One of the actor's characters. Someone else's is a 404, the same as a missing one. */
  public async get(actor: UserId, id: CharacterId): Promise<Character> {
    const character = await this.#repository.findById(id);
    if (character === undefined || !mayAccessCharacter(actor, character)) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }

  /** A new character, owned by the actor. */
  public async create(actor: UserId, input: CreateCharacterBody): Promise<Character> {
    this.#assertAncestryExists(input.ancestry);
    const id = CharacterId.parse(newId());
    const character = Character.create({
      id,
      ownerId: actor,
      name: input.name,
      ancestry: input.ancestry,
      now: this.#clock.now(),
    });
    return this.#repository.insert(character);
  }

  /** One field-level edit to one of the actor's characters, if it is still at `expectedVersion`. */
  public async patch(
    actor: UserId,
    id: CharacterId,
    { expectedVersion, patch }: PatchCharacterBody,
  ): Promise<Character> {
    const current = await this.get(actor, id);
    if (patch.field === CharacterPatchField.Ancestry) {
      this.#assertAncestryExists(patch.value);
    }
    return this.#repository.update(current.apply(patch, this.#clock.now()), expectedVersion);
  }

  #assertAncestryExists(ref: AncestryId): void {
    if (this.#content.ancestry(ref) === undefined) {
      throw new ValidationError([
        { path: ['ancestry'], message: message('character.validation.unknownAncestry', { ancestry: ref }) },
      ]);
    }
  }
}
