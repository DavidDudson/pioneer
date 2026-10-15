import {
  Character,
  CharacterCommand,
  CharacterId,
  CharacterPatchField,
  characterDeity,
  characterLanguages,
  deityContent,
  characterSlots,
  PATCH_COMMANDS,
  slotContent,
  slotRefusal,
  SPELL_ACCESS_MAX,
  SpellAccessProblem,
  spellAccessProblem,
  spellContent,
  unfitPicks,
} from '@pioneer/character/domain';
import type {
  CharacterListQuery,
  CharacterPatch,
  CharacterSheet,
  ClearedPick,
  CreateCharacterBody,
  PatchCharacterBody,
  PatchedCharacterSheet,
  SlotContent,
  SlotPick,
} from '@pioneer/character/domain';
import type { AncestryId, ContentId, ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { message, newId, NotFoundError, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId, Version } from '@pioneer/shared/kernel';

import { contentOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { editInputs } from './edit-inputs';
import { assertInventoryAllows } from './inventory-guard';

/** Why access to a spell is refused, by the problem. */
const SPELL_ACCESS_REFUSALS: Readonly<Record<SpellAccessProblem, string>> = {
  [SpellAccessProblem.UnknownSpell]: 'character.validation.unknownSpell',
  [SpellAccessProblem.Common]: 'character.validation.spellAccessCommon',
  [SpellAccessProblem.Full]: 'character.validation.spellAccessFull',
};

/** A character as an edit saved it, and the picks the edit cleared (`unfitPicks`). */
export interface PatchedCharacter {
  readonly character: Character;
  readonly cleared: readonly ClearedPick[];
}

/**
 * Character use cases. Framework-free: the HTTP adapter calls these with the signed-in user as
 * `actor`. Every use case applies the access policy here, never in routes.
 */
export class CharacterService {
  readonly #repository: CharacterRepository;
  readonly #content: CharacterContentSource;
  readonly #clock: Clock;

  public constructor(repository: CharacterRepository, content: CharacterContentSource, clock: Clock) {
    this.#repository = repository;
    this.#content = content;
    this.#clock = clock;
  }

  /** The content `character` is worked out over: the official packs and the homebrew packs it uses. */
  #contentOf(character: Character): ContentSource {
    return contentOfCharacter(this.#content, character);
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

  /**
   * `character` with every slot it has and the slot's status (#419), its languages (#470) and its deity (#469), read
   * over the loaded content. Worked out on each read, never stored. The caller has already applied the access policy
   * (`get`, `patch`).
   */
  public async sheet(character: Character): Promise<CharacterSheet> {
    const content = await this.#contentOf(character).registry();
    const slots = await this.#slotContent(character, content);
    const deity = characterDeity(character.document, slots, deityContent(content));
    return {
      character,
      slots: characterSlots(character.document, slots),
      languages: characterLanguages(character.document, slots),
      ...(deity === undefined ? {} : { deity }),
    };
  }

  /** The actor's archived characters (ADR-0062); nobody else's are listed. */
  public async listArchived(actor: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    return this.#repository.listArchivedForOwner(actor, query);
  }

  /**
   * Archives one of the actor's characters (ADR-0062): it reads as missing everywhere but the archived list until
   * restored. Archiving an archived one is harmless. Someone else's, or a missing one, is a 404.
   */
  public async archive(actor: UserId, id: CharacterId): Promise<Character> {
    const live = await this.#repository.findById(id);
    if (live !== undefined && mayAccessCharacter(actor, live)) {
      await this.#repository.archive(id, this.#clock.now(), { actor, command: CharacterCommand.ArchiveCharacter });
      return live;
    }
    return this.#archivedOf(actor, id);
  }

  /** Brings one of the actor's archived characters back as it was. Restoring a live one is harmless. */
  public async restore(actor: UserId, id: CharacterId): Promise<Character> {
    const archived = await this.#repository.findArchivedById(id);
    if (archived !== undefined && mayAccessCharacter(actor, archived)) {
      await this.#repository.restore(id, { actor, command: CharacterCommand.RestoreCharacter });
      return archived;
    }
    return this.get(actor, id);
  }

  /** The actor's archived character, or a 404. */
  async #archivedOf(actor: UserId, id: CharacterId): Promise<Character> {
    const archived = await this.#repository.findArchivedById(id);
    if (archived === undefined || !mayAccessCharacter(actor, archived)) {
      throw new NotFoundError('Character', id);
    }
    return archived;
  }

  /** A new character, owned by the actor. */
  public async create(actor: UserId, input: CreateCharacterBody): Promise<Character> {
    await this.#assertAncestryExists(input.ancestry);
    const id = CharacterId.parse(newId());
    const character = Character.create({
      id,
      ownerId: actor,
      name: input.name,
      ancestry: input.ancestry,
      now: this.#clock.now(),
    });
    return this.#repository.insert(character, { actor, command: CharacterCommand.CreateCharacter });
  }

  /** `patched` as its sheet, with the picks its edit cleared. */
  public async patchedSheet({ character, cleared }: PatchedCharacter): Promise<PatchedCharacterSheet> {
    return { ...(await this.sheet(character)), cleared };
  }

  /**
   * One edit to one of the actor's characters, if it is still at `expectedVersion`. A slot pick that leaves a pick in a
   * slot within it unoffered (a heritage of the old ancestry) clears that pick in the same write, and reports it.
   */
  public async patch(
    actor: UserId,
    id: CharacterId,
    { expectedVersion, patch }: PatchCharacterBody,
  ): Promise<PatchedCharacter> {
    const current = await this.get(actor, id);
    await this.#assertAllowed(current, expectedVersion, patch);
    const inputs = await editInputs(this.#contentOf(current), current, patch);
    const now = this.#clock.now();
    const edited = current.apply(patch, now, inputs);
    const cleared = await this.#unfitPicks(current, edited, patch);
    let next = edited;
    for (const pick of cleared) {
      next = next.apply({ field: CharacterPatchField.ClearSlot, slot: pick.key }, now);
    }
    const character = await this.#repository.update(next, expectedVersion, {
      actor,
      command: PATCH_COMMANDS[patch.field],
    });
    return { character, cleared };
  }

  /**
   * Refuses `patch` before anything is written. A stale edit is a conflict before it is anything else: the refusals
   * read the latest version, which the client hasn't seen.
   */
  async #assertAllowed(current: Character, expectedVersion: Version, patch: CharacterPatch): Promise<void> {
    if (current.version !== expectedVersion) {
      throw new VersionConflictError('Character', current.id);
    }
    if (patch.field === CharacterPatchField.SelectSlot) {
      await this.#assertSlotOffers(current, patch);
    }
    if (patch.field === CharacterPatchField.GrantSpellAccess) {
      await this.#assertSpellNeedsAccess(current, patch.spell);
    }
    await assertInventoryAllows(current, patch, this.#contentOf(current));
  }

  /** Refuses access to a spell no loaded pack has for a slot (a focus spell among them), a common one, or past the most. */
  async #assertSpellNeedsAccess(character: Character, spell: ContentId): Promise<void> {
    const content = await this.#contentOf(character).registry();
    const problem = spellAccessProblem(spellContent(content), character.document.build.spellAccess, spell);
    if (problem !== undefined) {
      const refusal =
        problem === SpellAccessProblem.Full
          ? message(SPELL_ACCESS_REFUSALS[problem], { maximum: SPELL_ACCESS_MAX })
          : message(SPELL_ACCESS_REFUSALS[problem]);
      throw new ValidationError([{ path: ['patch', 'spell'], message: refusal }]);
    }
  }

  /** The slots `character` has over `registry`, with the variant rules in force for it (Dual Class adds a class). */
  async #slotContent(character: Character, registry: ContentRegistry): Promise<SlotContent> {
    return slotContent(registry, await variantRulesOfCharacter(this.#content, character, registry));
  }

  /** The picks a slot edit left in slots within the edited one that no longer offer them; none for any other edit. */
  async #unfitPicks(before: Character, after: Character, patch: CharacterPatch): Promise<readonly ClearedPick[]> {
    const isSlotEdit = patch.field === CharacterPatchField.SelectSlot || patch.field === CharacterPatchField.ClearSlot;
    if (!isSlotEdit) {
      return [];
    }
    const content = await this.#contentOf(before).registry();
    return unfitPicks(before.document, after.document, await this.#slotContent(before, content));
  }

  /**
   * Refuses a selection the slot doesn't offer at any level up to 20, or for a slot the character never has. A
   * selection already stored is never checked again here: one a lower level hides, or content later invalidates, stays.
   */
  async #assertSlotOffers(character: Character, pick: SlotPick): Promise<void> {
    const content = await this.#contentOf(character).registry();
    const refusal = slotRefusal(character.document, await this.#slotContent(character, content), pick);
    if (refusal !== undefined) {
      throw new ValidationError([{ path: ['patch', refusal.field], message: refusal.message }]);
    }
  }

  async #assertAncestryExists(ref: AncestryId): Promise<void> {
    const content = await this.#content.registry();
    if (content.ancestry(ref) === undefined) {
      throw new ValidationError([
        { path: ['ancestry'], message: message('character.validation.unknownAncestry', { ancestry: ref }) },
      ]);
    }
  }
}
