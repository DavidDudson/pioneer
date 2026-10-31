import {
  applyPlayCommand,
  applyTurnCommand,
  characterPredicateFacts,
  characterStatisticInputs,
  conditionValued,
  effectContent,
  environmentContent,
  environmentGroups,
  isBreathCommand,
  isEnvironmentCommand,
  isShieldCommand,
  isTurnCommand,
  isWandCommand,
  needsConditionContent,
  needsEffectContent,
  needsMaxHitPoints,
  needsResourceMaxima,
  needsRestContent,
  NO_COUNTED,
  NO_EFFECTS,
  NO_ENVIRONMENT_GROUPS,
  NO_RESOURCES,
  NO_SHIELDS,
  NO_STAFF,
  outOfAir,
  PLAY_COMMANDS,
  PlayCommandField,
  restHealing,
  restRecovery,
  slotContent,
  turnCommandInputs,
  unconsciousCondition,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  CharacterPlay,
  ConditionValued,
  EffectContent,
  PatchedPlay,
  PatchPlayBody,
  PlayCommand,
  PlayEdit,
  PlayLimits,
  PlayState,
  StaffLimits,
  TurnCommand,
  TurnOutcome,
} from '@pioneer/character/domain';
import { cryptoRandom } from '@pioneer/rules/dice';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import type { ContentRegistry, ContentSource, HitPoints } from '@pioneer/rules/sdk';
import { NotFoundError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { contentOfCharacter, variantRulesOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import { mayAccessCharacter } from './character-policy';
import type { CharacterRepository, PlayWrite } from './character-repository';
import {
  checkCondition,
  checkEffect,
  checkEnvironment,
  checkExploration,
  checkStaff,
  isDailyPreparations,
} from './play-checks';
import { countedOf, resourceMaximaOf, slotsOf, staffOf } from './play-content-limits';
import { NO_MAX_HIT_POINTS, NO_REST, NO_VALUED, turnLimits } from './play-defaults';
import type { RestContent } from './play-defaults';
import { derivedMaxHitPoints } from './play-hit-points';
import { changesInventory, inventoryAfter } from './play-inventory';
import { shieldsOf } from './play-shield';
import { shiftsForm, spendLimits } from './play-spend';
import { checkStaffCast, staffCastOf, takesBackCast } from './play-staff';

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
  ): Promise<PatchedPlay> {
    const character = await this.#accessible(actor, id);
    const current = await this.#stored(id);
    if (current.revision !== expectedRevision) {
      throw new VersionConflictError('CharacterPlay', id);
    }
    await checkExploration(command, async () => this.#contentOf(character).registry());
    await checkEnvironment(command, async () => this.#contentOf(character).registry());
    const reinventoried = await this.#reinventoried(character, current.play, command);
    const { play, events } = isTurnCommand(command)
      ? await this.#turned(character, current.play, command)
      : { play: await this.#applied(character, current.play, command), events: [] };
    const write: PlayWrite = {
      id,
      play,
      expectedRevision,
      audit: { actor, command: PLAY_COMMANDS[command.field] },
      now: this.#clock.now(),
    };
    const saved =
      reinventoried === undefined
        ? await this.#characters.updatePlay(write)
        : await this.#characters.updatePlayAndCharacter(write, reinventoried, character.version);
    return { ...saved, events: [...events] };
  }

  /** The character with its inventory changed by the edit (a wand broken, a shield broken or destroyed), or undefined when it stays as it is. */
  async #reinventoried(character: Character, play: PlayState, command: PlayEdit): Promise<Character | undefined> {
    if (!changesInventory(command)) {
      return undefined;
    }
    const registry = await this.#contentOf(character).registry();
    const counted = isWandCommand(command) ? await countedOf(this.#content, character) : NO_COUNTED;
    const slots = await slotsOf(this.#content, character, registry);
    return inventoryAfter({ character, play, registry, slots, counted, now: this.#clock.now() }, command);
  }

  /** The staves a play edit reads: daily preparations prepares one, and a staff cast is checked, which gives its cost. */
  async #staffLimits(character: Character, play: PlayState, command: PlayCommand): Promise<StaffLimits> {
    const prepared = isDailyPreparations(command) ? await staffOf(this.#content, character) : NO_STAFF;
    checkStaff(command, prepared);
    const cast = staffCastOf(play, command);
    if (cast === undefined) {
      return prepared;
    }
    const registry = await this.#contentOf(character).registry();
    const slots = await slotsOf(this.#content, character, registry);
    const counted = await countedOf(this.#content, character);
    const undoing = takesBackCast(command, cast);
    return { ...prepared, castCost: checkStaffCast(cast, { character, play, registry, slots, counted, undoing }) };
  }

  /**
   * A turn-cycle edit: Start turn or End turn run their bookkeeping with the server's dice, and say what it did; leaving
   * the encounter does nothing else. The maximum Hit Points and the content are derived from the build, as for any edit.
   */
  async #turned(character: Character, play: PlayState, command: TurnCommand): Promise<TurnOutcome> {
    const registry = await this.#contentOf(character).registry();
    const variants = await variantRulesOfCharacter(this.#content, character, registry);
    const slots = slotContent(registry, variants);
    const inputs = characterStatisticInputs(registry, character.document, slots);
    const limits = turnLimits(
      await derivedMaxHitPoints(this.#content, character, play),
      await this.#effects(character),
      conditionValued(registry),
    );
    const turn = turnCommandInputs({ registry, slots, inputs, variants }, character.document, limits);
    return applyTurnCommand(play, command, { inputs: turn, random: cryptoRandom });
  }

  /**
   * Temporary Hit Points and the death track need no maximum, so a character without one can still use them. Each
   * limit is derived only for the edits that read it.
   */
  async #applied(character: Character, play: PlayState, command: PlayCommand): Promise<PlayState> {
    const hitPoints = needsMaxHitPoints(command)
      ? await derivedMaxHitPoints(this.#content, character, play)
      : NO_MAX_HIT_POINTS;
    const resources = needsResourceMaxima(command) ? await resourceMaximaOf(this.#content, character) : NO_RESOURCES;
    const counted = needsResourceMaxima(command) ? await countedOf(this.#content, character) : NO_COUNTED;
    const staff = await this.#staffLimits(character, play, command);
    const valued = needsConditionContent(command) ? await this.#valued(character) : NO_VALUED;
    checkCondition(play, command, valued);
    const effects = needsEffectContent(command) ? await this.#effects(character) : NO_EFFECTS;
    checkEffect(play, command, effects);
    const { healing, recovery } = needsRestContent(command) ? await this.#rest(character) : NO_REST;
    const registry = await this.#contentOf(character).registry();
    const limits: PlayLimits = {
      hitPoints,
      healing,
      recovery,
      resources,
      counted,
      staff,
      valued,
      effects,
      environmentGroups: isEnvironmentCommand(command)
        ? environmentGroups(environmentContent(registry))
        : NO_ENVIRONMENT_GROUPS,
      shields: isShieldCommand(command) ? shieldsOf(character, registry) : NO_SHIELDS,
      spend: spendLimits(command, {
        play,
        counted,
        points: resources,
        registry,
        facts: shiftsForm(command) ? await this.#facts(character, registry) : undefined,
        now: this.#clock.now(),
      }),
    };
    return PlayService.#fallenUnconscious(command, applyPlayCommand(play, command, limits), { limits, registry });
  }

  /** `play` after `command`, with Unconscious on a character that setting its breath left out of air; other edits as they are. */
  static #fallenUnconscious(
    command: PlayCommand,
    play: PlayState,
    { limits, registry }: { readonly limits: PlayLimits; readonly registry: ContentRegistry },
  ): PlayState {
    const airLost = isBreathCommand(command) || (command.field === PlayCommandField.Damage && command.damage.critical);
    return airLost
      ? outOfAir({ play, events: [] }, { limits, unconscious: unconsciousCondition(registry) }).play
      : play;
  }

  /** The roll options the character's build sets, which a form shift's predicate reads. */
  async #facts(character: Character, registry: ContentRegistry): Promise<PredicateFacts> {
    return characterPredicateFacts(character.document, { slots: await slotsOf(this.#content, character, registry) });
  }

  /** What Rest heals, from the Constitution modifier and level the build gives. */
  async #healing(character: Character): Promise<HitPoints> {
    const registry = await this.#contentOf(character).registry();
    const slots = await slotsOf(this.#content, character, registry);
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
