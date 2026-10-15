import {
  abilityFrequencies,
  applyPlayCommand,
  characterCounted,
  characterFocus,
  characterGrants,
  characterSpellcasting,
  characterStatisticInputs,
  characterStatistics,
  itemContent,
  NO_STAFF,
  staffLimits,
  StaffProblem,
  staffProblem,
  conditionProblem,
  effectContent,
  EffectProblem,
  effectProblem,
  isEffectCommand,
  needsEffectContent,
  NO_EFFECTS,
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
  PlayCommandField,
  ConditionProblem,
  resourceMaxima,
  restHealing,
  restRecovery,
  slotContent,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterPlay,
  PatchPlayBody,
  ConditionValued,
  EffectContent,
  PlayCommand,
  PlayLimits,
  RecoveryConditions,
  SlotContent,
  PlayState,
  ResourceMaxima,
  CountedMaxima,
  StaffLimits,
} from '@pioneer/character/domain';
import { HitPoints } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentSource } from '@pioneer/rules/sdk';
import { message, NotFoundError, ValidationError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { contentOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository } from './character-repository';

/** The maximum handed to edits that don't read it, so none has to be derived for them. */
const NO_MAX_HIT_POINTS = HitPoints.parse(0);

/** The condition content handed to edits that don't read it. */
const NO_VALUED: ConditionValued = new Map();

/** What Rest reads from the build and the content. */
interface RestContent {
  readonly healing: HitPoints;
  readonly recovery: RecoveryConditions;
}

/** The Rest content handed to edits that don't read it. */
const NO_REST: RestContent = { healing: NO_MAX_HIT_POINTS, recovery: new Map() };

/** The message each refused effect edit answers with. */
const EFFECT_MESSAGES = {
  [EffectProblem.Unknown]: 'character.validation.effectUnknown',
  [EffectProblem.Missing]: 'character.validation.effectMissing',
  [EffectProblem.Full]: 'character.validation.effectFull',
  [EffectProblem.Badge]: 'character.validation.effectBadge',
} as const satisfies Record<EffectProblem, string>;

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
  readonly #content: CharacterContentSource;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, content: CharacterContentSource, clock: Clock) {
    this.#characters = characters;
    this.#content = content;
    this.#clock = clock;
  }

  #contentOf(character: Character): ContentSource {
    return contentOfCharacter(this.#content, character);
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
    const staff = isDailyPreparations(command) ? await this.#staff(character) : NO_STAFF;
    checkStaff(command, staff);
    const valued = needsConditionContent(command) ? await this.#valued(character) : NO_VALUED;
    checkCondition(play, command, valued);
    const effects = needsEffectContent(command) ? await this.#effects(character) : NO_EFFECTS;
    checkEffect(play, command, effects);
    const { healing, recovery } = needsRestContent(command) ? await this.#rest(character) : NO_REST;
    const limits: PlayLimits = {
      hitPoints,
      healing,
      recovery,
      resources,
      counted,
      staff,
      valued,
      effects,
    };
    return applyPlayCommand(play, command, limits);
  }

  /** The slots `character` has over `registry`, with the variant rules in force for it (Dual Class adds a class). */
  async #slotContent(character: Character, registry: ContentRegistry): Promise<SlotContent> {
    return slotContent(registry, await variantRulesOfCharacter(this.#content, character, registry));
  }

  /** Hero points are at most 3; the focus pool comes from the character's focus spells and feats. */
  async #resourceMaxima(character: Character): Promise<ResourceMaxima> {
    const registry = await this.#contentOf(character).registry();
    const slots = await this.#slotContent(character, registry);
    const entries = characterSpellcasting(characterGrants(character.document, slots));
    return resourceMaxima(characterFocus(entries, slots.spells, character.document.level).pool);
  }

  /** Spell slots by entry and rank, and ability uses, as the build and the content give them. */
  async #counted(character: Character): Promise<CountedMaxima> {
    const registry = await this.#contentOf(character).registry();
    const grants = characterGrants(character.document, await this.#slotContent(character, registry));
    return characterCounted(grants, abilityFrequencies(registry), {
      items: character.document.inventory.items,
      activations: itemActivations(registry),
    });
  }

  /** The staves, highest spell rank and expendable slots daily preparations reads to prepare a staff. */
  async #staff(character: Character): Promise<StaffLimits> {
    const registry = await this.#contentOf(character).registry();
    const grants = characterGrants(character.document, await this.#slotContent(character, registry));
    return staffLimits(grants, character.document.inventory.items, itemContent(registry));
  }

  /** What Rest heals, from the Constitution modifier and level the build gives. */
  async #healing(character: Character): Promise<HitPoints> {
    const registry = await this.#contentOf(character).registry();
    const slots = await this.#slotContent(character, registry);
    return restHealing(characterStatisticInputs(registry, character.document, slots));
  }

  /** What Rest heals, and what it does to the conditions the character's content eases on Rest. */
  async #rest(character: Character): Promise<RestContent> {
    const registry = await this.#contentOf(character).registry();
    return { healing: await this.#healing(character), recovery: restRecovery(registry) };
  }

  /** Which conditions the server's content has, and which carry a value. */
  async #valued(character: Character): Promise<ConditionValued> {
    return conditionValued(await this.#contentOf(character).registry());
  }

  /** Which effects the server's content has, and the clock and badge each starts from. */
  async #effects(character: Character): Promise<EffectContent> {
    return effectContent(await this.#contentOf(character).registry());
  }

  async #maxHitPoints(character: Character, play: PlayState): Promise<HitPoints> {
    const registry = await this.#contentOf(character).registry();
    const variants = await variantRulesOfCharacter(this.#content, character, registry);
    const slots = slotContent(registry, variants);
    const inputs = characterStatisticInputs(registry, character.document, slots);
    const sources = { registry, slots, inputs, variants };
    const max = maxHitPoints(characterStatistics({ ...character.document, play }, sources));
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

/** The message each refused staff choice answers with. */
const STAFF_MESSAGES = {
  [StaffProblem.NotAStaff]: 'character.validation.staffNotHeld',
  [StaffProblem.SlotWithoutStaff]: 'character.validation.staffSlotWithoutStaff',
  [StaffProblem.SlotNotExpendable]: 'character.validation.staffSlotNotExpendable',
} as const satisfies Record<StaffProblem, string>;

/** Daily preparations, the only edit that prepares a staff. */
type DailyPreparations = Extract<PlayCommand, { readonly field: typeof PlayCommandField.DailyPreparations }>;

/** Whether `command` is daily preparations, the only edit that prepares a staff. */
function isDailyPreparations(command: PlayCommand): command is DailyPreparations {
  return command.field === PlayCommandField.DailyPreparations;
}

/** Refuses a daily preparations that names a staff the character doesn't have, or a slot it can't expend. */
function checkStaff(command: PlayCommand, staff: StaffLimits): void {
  const problem = isDailyPreparations(command) ? staffProblem(command, staff) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(STAFF_MESSAGES[problem]) }]);
  }
}

/** Refuses an effect edit the content or the character's effects rule out. */
function checkEffect(play: PlayState, command: PlayCommand, content: EffectContent): void {
  const problem = isEffectCommand(command) ? effectProblem(play.effects, command, content) : undefined;
  if (problem !== undefined) {
    throw new ValidationError([{ path: ['command'], message: message(EFFECT_MESSAGES[problem]) }]);
  }
}
