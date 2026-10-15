import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionData, ActionMode, ContentId, Origin, Proficiency, RollOption, Selector } from '@pioneer/rules/sdk';
import type { Predicate } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { ActionOriginKind, ActionStatus, availableActions } from './available-actions';
import type { ActionCandidate, ActionOrigin, AvailableAction, AvailableActionsInput } from './available-actions';
import { deriveStatistics } from './derive-statistics';
import { EngineMessage } from './messages';
import { StatisticInputsJson } from './statistic-inputs';
import type { StatisticResult } from './statistic-result';
import { statistic } from './testing';

const BASIC: ActionOrigin = { kind: ActionOriginKind.Basic };
const ATHLETICS = Selector.parse('skill:athletics');
const THIEVERY = Selector.parse('skill:thievery');
const SHIELD_RAISED = RollOption.parse('self:effect:shield-raised');
const ID_DIGITS = 12;
const STRENGTH = 2;

let counter = 0;

function nextId(): ContentId {
  counter += 1;
  return ContentId.parse(`00000000-0000-4000-8000-${String(counter).padStart(ID_DIGITS, '0')}`);
}

function candidate(data: object, origin: ActionOrigin = BASIC): ActionCandidate {
  return { id: nextId(), action: ActionData.parse(data), origin };
}

function factsOf(...options: readonly RollOption[]): PredicateFacts {
  return new PredicateFacts(options, CORE_NAMESPACES);
}

type Situation = Partial<Omit<AvailableActionsInput, 'candidates'>>;

/** The one action's entry once the engine has weighed it in the situation. */
function weigh(action: ActionCandidate, situation: Situation = {}): AvailableAction {
  const [first, ...rest] = availableActions({
    candidates: [action],
    facts: factsOf(),
    ranks: new Map(),
    spent: new Set(),
    statistics: new Map(),
    ...situation,
  });
  if (first === undefined || rest.length > 0) {
    throw new Error('Expected one action');
  }
  return first;
}

function reasonKeys({ reasons }: AvailableAction): readonly string[] {
  return reasons.map(({ key }) => key);
}

const statisticInputs = StatisticInputsJson.parse({
  level: 1,
  attributes: { str: STRENGTH, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
  ranks: {},
});

function athleticsStatistics(): ReadonlyMap<Selector, StatisticResult> {
  const content = {
    definitions: [statistic('skill:athletics', '@attr.str')],
    proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS,
  };
  return deriveStatistics(content, statisticInputs, { rules: [], facts: factsOf() });
}

const WORDING = [{ type: 'paragraph', content: [{ type: 'text', text: 'You have a free hand.' }] }];

describe('availableActions status', () => {
  test('an action with nothing to test is available with no reasons', () => {
    const result = weigh(candidate({ cost: 'one' }));

    expect(result.status).toBe(ActionStatus.Available);
    expect(result.reasons).toStrictEqual([]);
    expect(result.cost).toBe('one');
  });

  test('requirements that hold leave it available', () => {
    const needsShield: Predicate = [SHIELD_RAISED];
    const action = candidate({ cost: 'reaction', trigger: WORDING, requirements: needsShield });

    expect(weigh(action, { facts: factsOf(SHIELD_RAISED) }).status).toBe(ActionStatus.Available);
  });

  test('requirements that fail make it unavailable, with a reason', () => {
    const action = candidate({ cost: 'reaction', trigger: WORDING, requirements: [SHIELD_RAISED] });

    const result = weigh(action);

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(reasonKeys(result)).toStrictEqual([EngineMessage.ActionRequirementsNotMet]);
  });

  test('requirements that depend on the situation make it conditional', () => {
    const result = weigh(candidate({ cost: 'one', requirements: ['target:trait:undead'] }));

    expect(result.status).toBe(ActionStatus.Conditional);
    expect(reasonKeys(result)).toStrictEqual([EngineMessage.ActionRequirementsUnknown]);
  });

  test('requirements that are only wording make it conditional', () => {
    const result = weigh(candidate({ cost: 'one', requirementsText: WORDING }));

    expect(result.status).toBe(ActionStatus.Conditional);
    expect(reasonKeys(result)).toStrictEqual([EngineMessage.ActionRequirementsText]);
  });

  test('a predicate decides, so wording beside it adds no doubt', () => {
    const action = candidate({ cost: 'one', requirements: [SHIELD_RAISED], requirementsText: WORDING });

    expect(weigh(action, { facts: factsOf(SHIELD_RAISED) }).status).toBe(ActionStatus.Available);
  });
});

describe('availableActions skills', () => {
  const trainedOnly = candidate({ cost: 'two', skills: [THIEVERY], minimumProficiency: Proficiency.Trained });

  test('a trained-only action is unavailable while untrained, naming the rank and skill', () => {
    const result = weigh(trainedOnly);

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(result.reasons).toStrictEqual([
      { key: EngineMessage.ActionUntrained, params: { rank: 'trained', skills: 'thievery' } },
    ]);
  });

  test('it is available once a listed skill is trained', () => {
    const ranks = new Map([[THIEVERY, Proficiency.Trained]]);

    expect(weigh(trainedOnly, { ranks }).status).toBe(ActionStatus.Available);
  });

  test('one skill at the rank is enough when the action lists several', () => {
    const either = candidate({ cost: 'one', skills: [ATHLETICS, THIEVERY], minimumProficiency: Proficiency.Expert });
    const trainedAthletics = new Map([[ATHLETICS, Proficiency.Trained]]);
    const expertThievery = new Map([[THIEVERY, Proficiency.Expert]]);

    expect(weigh(either, { ranks: trainedAthletics }).status).toBe(ActionStatus.Unavailable);
    expect(weigh(either, { ranks: expertThievery }).status).toBe(ActionStatus.Available);
  });

  test('an action that rolls carries the breakdown of its best skill', () => {
    const climb = candidate({ cost: 'one', skills: [ATHLETICS, THIEVERY] });

    const result = weigh(climb, { statistics: athleticsStatistics() });

    expect(result.roll?.selector).toBe(ATHLETICS);
    expect(Number(result.roll?.total)).toBe(STRENGTH);
  });

  test('an action with no skill rolls nothing', () => {
    expect(weigh(candidate({ cost: 'one' })).roll).toBeUndefined();
  });
});

describe('availableActions frequency', () => {
  test('a frequency with uses left leaves the action available', () => {
    const action = candidate({ cost: 'reaction', trigger: WORDING, frequency: { max: 1, per: 'round' } });

    expect(weigh(action).status).toBe(ActionStatus.Available);
  });

  test('a frequency with no uses left makes the action unavailable for the period', () => {
    const action = candidate({ cost: 'reaction', trigger: WORDING, frequency: { max: 1, per: 'round' } });

    const result = weigh(action, { spent: new Set([action.id]) });

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(result.reasons).toStrictEqual([{ key: EngineMessage.ActionFrequencySpent, params: { per: 'round' } }]);
  });

  test('every reason that blocks an action is listed', () => {
    const action = candidate({
      cost: 'one',
      skills: [THIEVERY],
      minimumProficiency: Proficiency.Trained,
      requirements: [SHIELD_RAISED],
      frequency: { max: 1, per: 'day' },
    });

    const result = weigh(action, { spent: new Set([action.id]) });

    expect(reasonKeys(result)).toStrictEqual([
      EngineMessage.ActionRequirementsNotMet,
      EngineMessage.ActionUntrained,
      EngineMessage.ActionFrequencySpent,
    ]);
  });
});

describe('availableActions list', () => {
  test('modes default to encounter and otherwise follow the action', () => {
    const plain = candidate({ cost: 'one' });
    const downtime = candidate({ modes: [ActionMode.Downtime] });

    expect(weigh(plain).modes).toStrictEqual([ActionMode.Encounter]);
    expect(weigh(downtime).modes).toStrictEqual([ActionMode.Downtime]);
  });

  test('an action offered twice appears once, the first offer winning', () => {
    const first = candidate({ cost: 'one' });
    const source = Origin.parse({ hops: [], entry: first.id, sources: [{ kind: 'book', book: 'player-core' }] });
    const granted: ActionOrigin = { kind: ActionOriginKind.Granted, source };

    const result = availableActions({
      candidates: [first, { ...first, origin: granted }],
      facts: factsOf(),
      ranks: new Map(),
      spent: new Set(),
      statistics: new Map(),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.origin).toStrictEqual(BASIC);
  });
});
