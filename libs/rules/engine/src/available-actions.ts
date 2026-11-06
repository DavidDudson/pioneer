import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionMode, Proficiency } from '@pioneer/rules/sdk';
import type { ActionCost, ActionData, ContentId, Origin, Selector, Trait } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { FormInPlay } from './battle-form';
import { formBlockers } from './battle-form-actions';
import { EngineMessage } from './messages';
import type { StatisticResult, StatisticValue } from './statistic-result';

/** Whether a character can use an action right now. */
export const ActionStatus = {
  Available: 'available',
  /** Usable if something the engine cannot see holds: requirements it cannot test, or a situation not yet known. */
  Conditional: 'conditional',
  Unavailable: 'unavailable',
} as const;
export type ActionStatus = ValueOf<typeof ActionStatus>;

/** Where an action on a character's list comes from. */
export const ActionOriginKind = {
  /** Every character has it. */
  Basic: 'basic',
  /** Every character has it, and it rolls a skill. */
  Skill: 'skill',
  /** Something the character has gives it: a feat, feature, item, spell or condition. */
  Granted: 'granted',
  /** An item the character owns: a consumable, an activation or a staff's spell. The sheet adds these beside the engine's. */
  Item: 'item',
} as const;
export type ActionOriginKind = ValueOf<typeof ActionOriginKind>;

export type ActionOrigin =
  | { readonly kind: typeof ActionOriginKind.Basic }
  | { readonly kind: typeof ActionOriginKind.Skill }
  | { readonly kind: typeof ActionOriginKind.Item }
  | { readonly kind: typeof ActionOriginKind.Granted; readonly source: Origin };

/** An action a character may have, with how it came to be on the list. */
export interface ActionCandidate {
  readonly id: ContentId;
  readonly action: ActionData;
  readonly origin: ActionOrigin;
  /** The traits of the entry the action is: `manipulate`, `auditory`. None when absent. */
  readonly traits?: readonly Trait[];
  /** Whether using it casts a spell: the Cast a Spell action, or a spell. */
  readonly casts?: boolean;
}

/** What the engine reads to decide which actions are usable. */
export interface AvailableActionsInput {
  readonly candidates: readonly ActionCandidate[];
  /** The roll options that hold now: conditions, a raised shield, what is held. */
  readonly facts: PredicateFacts;
  /** The rank in each skill, by selector (`skill:athletics`); a skill missing is untrained. */
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
  /** The actions with a frequency that has no uses left in the period. */
  readonly spent: ReadonlySet<ContentId>;
  /** Statistics to roll an action with, by selector. */
  readonly statistics: ReadonlyMap<Selector, StatisticResult>;
  /** The battle form in force, which can forbid casting, speaking and using hands; none when there is none. */
  readonly form?: FormInPlay | undefined;
}

/** One action on a character's list and whether it can be used now. */
export interface AvailableAction {
  readonly action: ContentId;
  readonly origin: ActionOrigin;
  readonly cost: ActionCost | undefined;
  readonly modes: readonly ActionMode[];
  readonly status: ActionStatus;
  /** Why it is not plainly available; never empty for a conditional or unavailable action. */
  readonly reasons: readonly MessageDescriptor[];
  /** The best of its skills to roll, with its breakdown; absent for an action that rolls nothing. */
  readonly roll: StatisticValue | undefined;
}

/** An action that lists no mode is used in encounters. */
const DEFAULT_MODES: readonly ActionMode[] = [ActionMode.Encounter];

const RANK_ORDER: readonly Proficiency[] = [
  Proficiency.Untrained,
  Proficiency.Trained,
  Proficiency.Expert,
  Proficiency.Master,
  Proficiency.Legendary,
];

const SKILL_PREFIX = 'skill:';

/** A skill as the player reads it: `arcana` for `skill:arcana`. */
const SkillName = z.string().min(1).brand<'SkillName'>();
type SkillName = z.infer<typeof SkillName>;

function atLeast(rank: Proficiency, needed: Proficiency): boolean {
  return RANK_ORDER.indexOf(rank) >= RANK_ORDER.indexOf(needed);
}

function skillName(selector: Selector): SkillName {
  return SkillName.parse(selector.startsWith(SKILL_PREFIX) ? selector.slice(SKILL_PREFIX.length) : selector);
}

/** Whether one of the action's skills is at the rank it needs; true for an action with no minimum. */
function skillsMeetMinimum({ skills, minimumProficiency }: ActionData, ranks: AvailableActionsInput['ranks']): boolean {
  if (minimumProficiency === undefined || skills === undefined) {
    return true;
  }
  return skills.some((skill) => atLeast(ranks.get(skill) ?? Proficiency.Untrained, minimumProficiency));
}

/** The reasons an action cannot be used at all. */
function blockers(candidate: ActionCandidate, input: AvailableActionsInput): readonly MessageDescriptor[] {
  const { id, action } = candidate;
  const reasons: MessageDescriptor[] = [];
  if (action.requirements !== undefined && evaluatePredicate(action.requirements, input.facts) === Truth.False) {
    reasons.push(message(EngineMessage.ActionRequirementsNotMet));
  }
  if (action.minimumProficiency !== undefined && !skillsMeetMinimum(action, input.ranks)) {
    reasons.push(
      message(EngineMessage.ActionUntrained, {
        rank: action.minimumProficiency,
        skills: (action.skills ?? []).map((skill) => skillName(skill)).join(', '),
      }),
    );
  }
  if (action.frequency !== undefined && input.spent.has(id)) {
    reasons.push(message(EngineMessage.ActionFrequencySpent, { per: action.frequency.per }));
  }
  reasons.push(...formBlockers({ traits: candidate.traits ?? [], casts: candidate.casts === true }, input.form));
  return reasons;
}

/**
 * The reasons an action that can be used might not be: a predicate whose answer depends on the situation, or
 * requirements that are only wording, since no predicate says what to test.
 */
function doubts({ action }: ActionCandidate, facts: PredicateFacts): readonly MessageDescriptor[] {
  if (action.requirements !== undefined) {
    return evaluatePredicate(action.requirements, facts) === Truth.Unknown
      ? [message(EngineMessage.ActionRequirementsUnknown)]
      : [];
  }
  return action.requirementsText === undefined ? [] : [message(EngineMessage.ActionRequirementsText)];
}

/** The skill of an action with the highest total, which is the one to roll; undefined when none has a value. */
function bestRoll({ skills }: ActionData, statistics: AvailableActionsInput['statistics']): StatisticValue | undefined {
  const values = (skills ?? []).flatMap((skill): StatisticValue[] => {
    const result = statistics.get(skill);
    return result?.ok === true ? [result] : [];
  });
  return values.toSorted((left, right) => right.total - left.total)[0];
}

function availableAction(candidate: ActionCandidate, input: AvailableActionsInput): AvailableAction {
  const { id, action, origin } = candidate;
  const blocked = blockers(candidate, input);
  const doubtful = blocked.length === 0 ? doubts(candidate, input.facts) : [];
  let status: ActionStatus = ActionStatus.Available;
  if (blocked.length > 0) {
    status = ActionStatus.Unavailable;
  } else if (doubtful.length > 0) {
    status = ActionStatus.Conditional;
  }
  return {
    action: id,
    origin,
    cost: action.cost,
    modes: action.modes ?? DEFAULT_MODES,
    status,
    reasons: [...blocked, ...doubtful],
    roll: bestRoll(action, input.statistics),
  };
}

/**
 * The actions a character has right now, each with whether it can be used and why not (play-and-campaigns.md,
 * "Actions and the action economy"). An action is unavailable when its `requirements` predicate is false, no skill it
 * uses is at its `minimumProficiency`, its frequency has no uses left, or the battle form in force forbids what it
 * needs (casting, speaking, using hands); conditional when its requirements cannot be tested, because the
 * predicate's answer is unknown or they are only wording; available otherwise. An action offered twice appears once,
 * the first offer winning. Order follows the candidates.
 */
export function availableActions(input: AvailableActionsInput): readonly AvailableAction[] {
  const seen = new Set<ContentId>();
  return input.candidates
    .filter(({ id }) => {
      const fresh = !seen.has(id);
      seen.add(id);
      return fresh;
    })
    .map((candidate) => availableAction(candidate, input));
}
