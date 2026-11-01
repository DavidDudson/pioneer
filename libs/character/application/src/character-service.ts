import {
  Character,
  CharacterCommand,
  characterDeity,
  CharacterId,
  characterLanguages,
  CharacterPatchField,
  characterSlots,
  customEffectAuthorIds,
  CustomEffectId,
  deityContent,
  overrideAuthorIds,
  OverrideId,
  PATCH_COMMANDS,
  RepertoireSwap,
  repertoireSwap,
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
  RuleLimits,
  SlotContent,
} from '@pioneer/character/domain';
import type { AncestryId, ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { message, newId, NotFoundError, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId, Version } from '@pioneer/shared/kernel';

import { editableCharacter, readableCharacter } from './character-access';
import type { EditableCharacter } from './character-access';
import type { CharacterCampaignRoles } from './character-campaign-roles';
import { contentOfCharacter, ruleLimitsOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { assertCustomEffectAllowed } from './custom-effect-guard';
import { editInputs } from './edit-inputs';
import { InMemoryCharacterCampaignRoles } from './in-memory-character-campaign-roles';
import { InMemoryOverrideAuthorDirectory } from './in-memory-override-author-directory';
import { assertInventoryAllows } from './inventory-guard';
import type { OverrideAuthorDirectory } from './override-author-directory';
import { assertOverrideAllowed } from './override-guard';
import { SlotContentCache } from './slot-content-cache';
import { assertSlotEditAllowed } from './slot-edit-guard';
import { assertSpellNeedsAccess } from './spell-access-guard';

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
  #authors: OverrideAuthorDirectory = new InMemoryOverrideAuthorDirectory();
  #roles: CharacterCampaignRoles = new InMemoryCharacterCampaignRoles();
  readonly #slotContents = new SlotContentCache();

  public constructor(repository: CharacterRepository, content: CharacterContentSource, clock: Clock) {
    this.#repository = repository;
    this.#content = content;
    this.#clock = clock;
  }

  /** This service naming override authors through `authors`; without it, nobody is named. */
  public withAuthors(authors: OverrideAuthorDirectory): this {
    this.#authors = authors;
    return this;
  }

  /** This service letting the GM of a character's campaign read it and edit its overrides, as `roles` says who that is. */
  public withCampaignRoles(roles: CharacterCampaignRoles): this {
    this.#roles = roles;
    return this;
  }

  /** The content `character` is worked out over: the official packs and the homebrew packs it uses. */
  #contentOf(character: Character): ContentSource {
    return contentOfCharacter(this.#content, character);
  }

  /** The limits `character`'s inventory is held to: its campaign's, else the core rules' (ADR-0064). */
  async #limitsOf(character: Character): Promise<RuleLimits> {
    return ruleLimitsOfCharacter(this.#content, character);
  }

  /** The table limits one of the actor's characters is held to. Someone else's is a 404, the same as a missing one. */
  public async ruleLimits(actor: UserId, id: CharacterId): Promise<RuleLimits> {
    return this.#limitsOf(await this.get(actor, id));
  }

  /** The actor's own characters; nobody else's are listed. */
  public async list(actor: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    return this.#repository.listForOwner(actor, query);
  }

  /** One of the actor's characters, or one in a campaign they are the GM of. Anyone else's is a 404. */
  public async get(actor: UserId, id: CharacterId): Promise<Character> {
    return readableCharacter({ repository: this.#repository, roles: this.#roles }, actor, id);
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
    const names = await this.#authors.displayNames([
      ...overrideAuthorIds(character.document.overrides),
      ...customEffectAuthorIds(character.document.customEffects),
    ]);
    const authors = [...names].map(([userId, displayName]) => ({ userId, displayName }));
    return {
      character,
      slots: characterSlots(character.document, slots),
      languages: characterLanguages(character.document, slots),
      ...(deity === undefined ? {} : { deity }),
      ...(authors.length === 0 ? {} : { authors }),
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
    const editable = await editableCharacter({ repository: this.#repository, roles: this.#roles }, actor, {
      id,
      patch,
    });
    const { character: current, actorRole } = editable;
    await this.#assertAllowed(editable, expectedVersion, patch);
    const inputs = {
      ...(await editInputs(this.#contentOf(current), current, patch)),
      countsAsSwap: (await this.#swapOf(current, patch)) === RepertoireSwap.Counts,
      limits: await this.#limitsOf(current),
      actor,
      actorRole,
      newOverrideId: OverrideId.parse(newId()),
      newCustomEffectId: CustomEffectId.parse(newId()),
    };
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
  async #assertAllowed(
    { character: current, actorRole }: EditableCharacter,
    expectedVersion: Version,
    patch: CharacterPatch,
  ): Promise<void> {
    if (current.version !== expectedVersion) {
      throw new VersionConflictError('Character', current.id);
    }
    if (patch.field === CharacterPatchField.SelectSlot || patch.field === CharacterPatchField.ClearSlot) {
      const slots = await this.#slotContent(current, await this.#contentOf(current).registry());
      assertSlotEditAllowed(current, slots, patch);
    }
    if (patch.field === CharacterPatchField.GrantSpellAccess) {
      assertSpellNeedsAccess(await this.#contentOf(current).registry(), current, patch.spell);
    }
    assertOverrideAllowed(current, patch, actorRole);
    assertCustomEffectAllowed(current, patch, actorRole);
    await assertInventoryAllows(current, patch, {
      content: this.#contentOf(current),
      tableLimits: await this.#limitsOf(current),
    });
  }

  /** The slots `character` has over `registry`, with the variant rules in force for it (Dual Class adds a class). */
  async #slotContent(character: Character, registry: ContentRegistry): Promise<SlotContent> {
    return this.#slotContents.of(registry, await variantRulesOfCharacter(this.#content, character, registry));
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

  /** What a slot edit costs in repertoire swaps: nothing for any other edit (#594). */
  async #swapOf(character: Character, patch: CharacterPatch): Promise<RepertoireSwap> {
    if (patch.field !== CharacterPatchField.SelectSlot && patch.field !== CharacterPatchField.ClearSlot) {
      return RepertoireSwap.Free;
    }
    const content = await this.#slotContent(character, await this.#contentOf(character).registry());
    const selection = patch.field === CharacterPatchField.SelectSlot ? patch.selection : undefined;
    return repertoireSwap(character.document, content, { slot: patch.slot, selection });
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
