import {
  abilityFrequencies,
  applyPlayCommand,
  characterCounted,
  characterFocus,
  characterGrants,
  characterSpellcasting,
  characterStatisticInputs,
  characterStatistics,
  conditionProblem,
  isConditionCommand,
  conditionValued,
  itemActivations,
  maxHitPoints,
  needsConditionContent,
  needsMaxHitPoints,
  needsResourceMaxima,
  needsRestContent,
  NO_COUNTED,
  NO_RESOURCES,
  PLAY_COMMANDS,
  RECOVERY_CONDITIONS,
  ConditionProblem,
  resourceMaxima,
  restHealing,
  slotContent,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterPlay,
  PatchPlayBody,
  ConditionValued,
  PlayCommand,
  PlayLimits,
  PlayState,
  ResourceMaxima,
  CountedMaxima,
} from '@pioneer/character/domain';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentSource } from '@pioneer/rules/sdk';
import { message, NotFoundError, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** The maximum handed to edits that don't read it, so none has to be derived for them. */
const NO_MAX_HIT_POINTS = HitPoints.parse(0);

/** The condition content handed to edits that don't read it. */
const NO_VALUED: ConditionValued = new Map();

/** The message each refused condition edit answers with. */
const CONDITION_MESSAGES = {
  [ConditionProblem.Unknown]: 'character.validation.conditionUnknown',
  [ConditionProblem.Value]: 'character.validation.conditionValue',
  [ConditionProblem.Missing]: 'character.validation.conditionMissing',
  [ConditionProblem.Full]: 'character.validation.conditionFull',
} as const satisfies Record<ConditionProblem, string>;

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

  /**
   * Temporary Hit Points and the death track need no maximum, so a character without one can still use them. Each
   * limit is derived only for the edits that read it.
   */
  async #applied(character: Character, play: PlayState, command: PlayCommand): Promise<PlayState> {
    const hitPoints = needsMaxHitPoints(command) ? await this.#maxHitPoints(character, play) : NO_MAX_HIT_POINTS;
    const resources = needsResourceMaxima(command) ? await this.#resourceMaxima(character) : NO_RESOURCES;
    const counted = needsResourceMaxima(command) ? await this.#counted(character) : NO_COUNTED;
    const valued = needsConditionContent(command) ? await this.#valued() : NO_VALUED;
    checkCondition(play, command, valued);
    const healing = needsRestContent(command) ? await this.#healing(character) : NO_MAX_HIT_POINTS;
    const limits: PlayLimits = { hitPoints, healing, recovery: RECOVERY_CONDITIONS, resources, counted, valued };
    return applyPlayCommand(play, command, limits);
  }

  /** Hero points are at most 3; the focus pool comes from the character's focus spells and feats. */
  async #resourceMaxima(character: Character): Promise<ResourceMaxima> {
    const registry = await this.#content.registry();
    const slots = slotContent(registry);
    const entries = characterSpellcasting(characterGrants(character.document, slots));
    return resourceMaxima(characterFocus(entries, slots.spells, character.document.level).pool);
  }

  /** Spell slots by entry and rank, and ability uses, as the build and the content give them. */
  async #counted(character: Character): Promise<CountedMaxima> {
    const registry = await this.#content.registry();
    const grants = characterGrants(character.document, slotContent(registry));
    return characterCounted(grants, abilityFrequencies(registry), {
      items: character.document.inventory.items,
      activations: itemActivations(registry),
    });
  }

  /** What Rest heals, from the Constitution modifier and level the build gives. */
  async #healing(character: Character): Promise<HitPoints> {
    const registry = await this.#content.registry();
    return restHealing(characterStatisticInputs(registry, character.document, slotContent(registry)));
  }

  /** Which conditions the server's content has, and which carry a value. */
  async #valued(): Promise<ConditionValued> {
    return conditionValued(await this.#content.registry());
  }

  async #maxHitPoints(character: Character, play: PlayState): Promise<HitPoints> {
    const registry = await this.#content.registry();
    const slots = slotContent(registry);
    const inputs = characterStatisticInputs(registry, character.document, slots);
    const max = maxHitPoints(characterStatistics({ ...character.document, play }, { registry, slots, inputs }));
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

/** Refuses a condition edit the content or the character's conditions rule out. */
function checkCondition(play: PlayState, command: PlayCommand, valued: ConditionValued): void {
  const problem = isConditionCommand(command) ? conditionProblem(play.conditions, command, valued) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(CONDITION_MESSAGES[problem]) }]);
  }
}
