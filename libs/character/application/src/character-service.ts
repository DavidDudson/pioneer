import {
  attributeModifiers,
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
  SlotPick,
} from '@pioneer/character/domain';
import { characterImportReport, modifierDifferences, registryLookup } from '@pioneer/interop/pathbuilder';
import type { BoostChoices, PathbuilderImportResponse } from '@pioneer/interop/pathbuilder';
import { exportPioneerCharacter, registryNamer, unmatchedContent } from '@pioneer/interop/pioneer';
import type { PioneerCharacterFile, PioneerImportPreview } from '@pioneer/interop/pioneer';
import type { AncestryId, ContentId, ContentSource } from '@pioneer/rules/sdk';
import {
  FIRST_VERSION,
  message,
  newId,
  NotFoundError,
  ValidationError,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import type { Clock, UserId, Version } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';
import { editInputs } from './edit-inputs';
import { assertInventoryAllows } from './inventory-guard';
import { importedCharacter, matchedAncestry, readExport } from './pathbuilder-import';
import { readPioneerFile } from './pioneer-import';

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
  readonly #content: ContentSource;
  readonly #clock: Clock;

  public constructor(repository: CharacterRepository, content: ContentSource, clock: Clock) {
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

  /**
   * `character` with every slot it has and the slot's status (#419), its languages (#470) and its deity (#469), read
   * over the loaded content. Worked out on each read, never stored. The caller has already applied the access policy
   * (`get`, `patch`).
   */
  public async sheet(character: Character): Promise<CharacterSheet> {
    const content = await this.#content.registry();
    const slots = slotContent(content);
    const deity = characterDeity(character.document, slots, deityContent(content));
    return {
      character,
      slots: characterSlots(character.document, slots),
      languages: characterLanguages(character.document, slots),
      ...(deity === undefined ? {} : { deity }),
    };
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

  /**
   * A new character from a Pathbuilder export, written in one insert: name, level, ancestry, the background and class
   * when loaded, the heritage when its ancestry offers it (#555), each boost in its slot (#420) and the voluntary flaws
   * (#550). No modifier is stored; the report lists any the picks don't reproduce, and a loaded heritage left out as
   * not offered. The export is read again here, never taken from the client's preview. Refused, with nothing saved,
   * when it can't be read or its ancestry isn't loaded.
   */
  public async importPathbuilder(actor: UserId, raw: unknown): Promise<PathbuilderImportResponse> {
    const value = readExport(raw);
    const content = await this.#content.registry();
    const lookup = registryLookup(content);
    const ancestry = matchedAncestry(value, lookup);
    const id = CharacterId.parse(newId());
    const now = this.#clock.now();
    const create = (choices: BoostChoices): Character =>
      Character.create({ id, ownerId: actor, name: value.name, ancestry, level: value.level, choices, now });
    const slots = slotContent(content);
    const { character, unplaced, notOffered } = importedCharacter(value, { lookup, slots }, create);
    const saved = await this.#repository.insert(character, { actor, command: CharacterCommand.ImportPathbuilder });
    const report = characterImportReport(value, lookup, {
      notOffered,
      unplacedBoosts: unplaced,
      modifierDifferences: modifierDifferences(value.attributes, attributeModifiers(character.document, slots.boosts)),
    });
    return { character: saved, report };
  }

  /**
   * One of the actor's characters as a Pioneer character file: its stored inputs, each content entry named by pack and
   * slug. Refused when the character uses content no loaded pack has, since the file would lose it.
   */
  public async exportPioneer(actor: UserId, id: CharacterId): Promise<PioneerCharacterFile> {
    const character = await this.get(actor, id);
    const content = await this.#content.registry();
    const exported = exportPioneerCharacter(character.document, registryNamer(content));
    if (!exported.ok) {
      throw new ValidationError([
        {
          path: ['content'],
          message: message('character.validation.exportUnnamedContent', { count: exported.unnamed.length }),
        },
      ]);
    }
    return exported.file;
  }

  /**
   * What importing a Pioneer character file would make, saved nowhere: the character's name and level, and the content
   * the file names that no loaded pack has. Refused when the file can't be read.
   */
  public async previewPioneerImport(actor: UserId, raw: unknown): Promise<PioneerImportPreview> {
    const { file, document } = readPioneerFile(raw, actor);
    const content = await this.#content.registry();
    return { name: document.name, level: document.level, unmatched: unmatchedContent(file, registryNamer(content)) };
  }

  /**
   * A new character of the actor from a Pioneer character file, its stored inputs as the file had them: content no
   * loaded pack has stays as the ids it hashes to, which a pack that has it brings back. The file is read again here,
   * never taken from the client's preview. Refused, with nothing saved, when it can't be read.
   */
  public async importPioneer(actor: UserId, raw: unknown): Promise<Character> {
    const { document } = readPioneerFile(raw, actor);
    const now = this.#clock.now();
    const character = new Character({ document, version: FIRST_VERSION, createdAt: now, updatedAt: now });
    return this.#repository.insert(character, { actor, command: CharacterCommand.ImportPioneer });
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
    const inputs = await editInputs(this.#content, current, patch);
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
    await assertInventoryAllows(current, patch, this.#content);
  }

  /** Refuses access to a spell no loaded pack has for a slot (a focus spell among them), a common one, or past the most. */
  async #assertSpellNeedsAccess(character: Character, spell: ContentId): Promise<void> {
    const content = await this.#content.registry();
    const problem = spellAccessProblem(spellContent(content), character.document.build.spellAccess, spell);
    if (problem !== undefined) {
      const refusal =
        problem === SpellAccessProblem.Full
          ? message(SPELL_ACCESS_REFUSALS[problem], { maximum: SPELL_ACCESS_MAX })
          : message(SPELL_ACCESS_REFUSALS[problem]);
      throw new ValidationError([{ path: ['patch', 'spell'], message: refusal }]);
    }
  }

  /** The picks a slot edit left in slots within the edited one that no longer offer them; none for any other edit. */
  async #unfitPicks(before: Character, after: Character, patch: CharacterPatch): Promise<readonly ClearedPick[]> {
    const isSlotEdit = patch.field === CharacterPatchField.SelectSlot || patch.field === CharacterPatchField.ClearSlot;
    if (!isSlotEdit) {
      return [];
    }
    const content = await this.#content.registry();
    return unfitPicks(before.document, after.document, slotContent(content));
  }

  /**
   * Refuses a selection the slot doesn't offer at any level up to 20, or for a slot the character never has. A
   * selection already stored is never checked again here: one a lower level hides, or content later invalidates, stays.
   */
  async #assertSlotOffers(character: Character, pick: SlotPick): Promise<void> {
    const content = await this.#content.registry();
    const refusal = slotRefusal(character.document, slotContent(content), pick);
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
