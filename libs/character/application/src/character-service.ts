import {
  attributeModifiers,
  BACKGROUND_SLOT,
  boostContent,
  Character,
  CharacterCommand,
  CharacterId,
  CharacterPatchField,
  characterSlots,
  CLASS_SLOT,
  PATCH_COMMANDS,
  slotContent,
  slotRefusal,
  unfitPicks,
} from '@pioneer/character/domain';
import type {
  BoostContent,
  CharacterListQuery,
  CharacterPatch,
  CharacterSheet,
  ClearedPick,
  CreateCharacterBody,
  PatchCharacterBody,
  PatchedCharacterSheet,
  SlotPick,
} from '@pioneer/character/domain';
import {
  characterImportReport,
  ImportKind,
  modifierDifferences,
  PathbuilderProblem,
  placeBoosts,
  readPathbuilderExport,
  registryLookup,
} from '@pioneer/interop/pathbuilder';
import type {
  BoostChoices,
  ContentLookup,
  PathbuilderImport,
  PathbuilderImportResponse,
  PathbuilderName,
  PathbuilderReadFailure,
  UnplacedBoost,
} from '@pioneer/interop/pathbuilder';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentSource, SlotKey } from '@pioneer/rules/sdk';
import { fieldIssues, message, newId, NotFoundError, ValidationError } from '@pioneer/shared/kernel';
import type { Clock, FieldIssue, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

const PROBLEM_MESSAGES = {
  [PathbuilderProblem.Malformed]: 'character.import.problem.malformed',
  [PathbuilderProblem.ExportFailed]: 'character.import.problem.exportFailed',
} as const satisfies Record<PathbuilderProblem, string>;

/** A character as an edit saved it, and the picks the edit cleared (`unfitPicks`). */
export interface PatchedCharacter {
  readonly character: Character;
  readonly cleared: readonly ClearedPick[];
}

/** The background and first class an export names, in their slots, when each matches loaded content. */
function rootChoices(value: PathbuilderImport, lookup: ContentLookup): BoostChoices {
  const picks: [SlotKey, ImportKind, PathbuilderName | undefined][] = [
    [BACKGROUND_SLOT, ImportKind.Background, value.identity.background],
    [CLASS_SLOT, ImportKind.Class, value.identity.classes[0]],
  ];
  return Object.fromEntries(
    picks.flatMap(([slot, kind, name]) => {
      const match = name === undefined ? undefined : lookup.resolve(kind, name);
      return match === undefined ? [] : [[slot, ChoiceValue.parse(match.id)]];
    }),
  );
}

/** A character an export makes, and the export's boosts no slot took. */
interface ImportedCharacter {
  readonly character: Character;
  readonly unplaced: readonly UnplacedBoost[];
}

/** What an import is matched against: content by name, and the boosts each entry gives. */
interface ImportContent {
  readonly lookup: ContentLookup;
  readonly boosts: BoostContent;
}

/** The character `create` makes from an export: its background and class picked, then each boost in the slots they open. */
function importedCharacter(
  value: PathbuilderImport,
  { lookup, boosts }: ImportContent,
  create: (choices: BoostChoices) => Character,
): ImportedCharacter {
  const roots = rootChoices(value, lookup);
  const placement = placeBoosts(create(roots).document, boosts, value.boosts);
  return { character: create({ ...roots, ...placement.choices }), unplaced: placement.unplaced };
}

/** The problem first, as the issue the UI shows, then the schema issues that explain it. */
function readIssues({ problem, issues }: PathbuilderReadFailure): FieldIssue[] {
  return [{ path: [], message: message(PROBLEM_MESSAGES[problem]) }, ...fieldIssues(issues)];
}

/** The export read again on the server; refused when it can't be read. */
function readExport(raw: unknown): PathbuilderImport {
  const read = readPathbuilderExport(raw);
  if (!read.ok) {
    throw new ValidationError(readIssues(read));
  }
  return read.value;
}

/** The loaded ancestry the export names; refused by name when there is none. */
function matchedAncestry(value: PathbuilderImport, lookup: ContentLookup): AncestryId {
  const match = lookup.resolve(ImportKind.Ancestry, value.identity.ancestry);
  if (match === undefined) {
    throw new ValidationError([
      {
        path: ['build', 'ancestry'],
        message: message('character.validation.unmatchedAncestry', { ancestry: value.identity.ancestry }),
      },
    ]);
  }
  return AncestryId.parse(match.id);
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
   * `character` with every slot it has and the slot's status, read over the loaded content (#419). Worked out on each
   * read, never stored. The caller has already applied the access policy (`get`, `patch`).
   */
  public async sheet(character: Character): Promise<CharacterSheet> {
    const content = await this.#content.registry();
    return { character, slots: characterSlots(character.document, slotContent(content)) };
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
   * when loaded, and each boost in its slot (#420). No modifier is stored; the report lists any the boosts don't
   * reproduce. The export is read again here, never taken from the client's preview. Refused, with nothing saved, when
   * it can't be read or its ancestry isn't loaded.
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
    const boosts = boostContent(content);
    const { character, unplaced } = importedCharacter(value, { lookup, boosts }, create);
    const saved = await this.#repository.insert(character, { actor, command: CharacterCommand.ImportPathbuilder });
    const report = characterImportReport(value, lookup, {
      unplacedBoosts: unplaced,
      modifierDifferences: modifierDifferences(value.attributes, attributeModifiers(character.document, boosts)),
    });
    return { character: saved, report };
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
    if (patch.field === CharacterPatchField.SelectSlot) {
      await this.#assertSlotOffers(current, patch);
    }
    const now = this.#clock.now();
    const edited = current.apply(patch, now);
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
