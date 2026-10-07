import { Character, CharacterId, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterPatch, CreateCharacterBody } from '@pioneer/character/domain';
import type { AncestryId, ContentRegistry } from '@pioneer/rules/sdk';
import { newId, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, Version } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';

/** Character use cases. Framework-free: the HTTP adapter calls these. */
export class CharacterService {
  readonly #repository: CharacterRepository;
  readonly #content: ContentRegistry;
  readonly #clock: Clock;

  public constructor(repository: CharacterRepository, content: ContentRegistry, clock: Clock) {
    this.#repository = repository;
    this.#content = content;
    this.#clock = clock;
  }

  public async list(): Promise<readonly Character[]> {
    return this.#repository.list();
  }

  public async get(id: CharacterId): Promise<Character> {
    const character = await this.#repository.findById(id);
    if (character === undefined) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }

  public async create(input: CreateCharacterBody): Promise<Character> {
    this.#assertAncestryExists(input.ancestry);
    const id = CharacterId.parse(newId());
    const character = Character.create({ id, name: input.name, ancestry: input.ancestry, now: this.#clock.now() });
    return this.#repository.insert(character);
  }

  public async patch(id: CharacterId, expectedVersion: Version, patch: CharacterPatch): Promise<Character> {
    if (patch.field === CharacterPatchField.Ancestry) {
      this.#assertAncestryExists(patch.value);
    }
    const current = await this.get(id);
    return this.#repository.update(current.apply(patch, this.#clock.now()), expectedVersion);
  }

  #assertAncestryExists(ref: AncestryId): void {
    if (this.#content.ancestry(ref) === undefined) {
      throw new ValidationError([
        { code: 'custom', path: ['ancestry'], message: `Unknown ancestry ${ref}`, input: ref },
      ]);
    }
  }
}
