import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionData, ContentId, Proficiency, RollOption, Selector } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, integer, property, record, subarray } from 'fast-check';

import { ActionOriginKind, ActionStatus, availableActions } from './available-actions';
import type { ActionCandidate, AvailableAction } from './available-actions';

const SKILLS = ['athletics', 'thievery', 'arcana'].map((skill) => Selector.parse(`skill:${skill}`));

const OPTIONS = ['self:effect:shield-raised', 'self:effect:rage', 'target:trait:undead'].map((option) =>
  RollOption.parse(option),
);

const RANKS = Object.values(Proficiency);
const MAX_ACTIONS = 8;
const ID_DIGITS = 12;
const SELF = 'self:';
const WORDING = [{ type: 'paragraph', content: [{ type: 'text', text: 'Wording.' }] }];

/** The action data as the generator builds it, with a field set only when its spec gives it. */
interface ActionFields {
  cost: string;
  skills: ReadonlyArray<Selector>;
  requirements?: ReadonlyArray<RollOption>;
  requirementsText?: ReadonlyArray<object>;
  minimumProficiency?: Proficiency;
  frequency?: { max: number; per: string };
}

interface Spec {
  readonly requirement: RollOption | undefined;
  readonly wording: boolean;
  readonly minimum: Proficiency | undefined;
  readonly frequency: boolean;
  readonly spent: boolean;
}

interface Rank {
  readonly skill: Selector;
  readonly rank: Proficiency;
}

const spec = record({
  requirement: constantFrom<RollOption | undefined>(...OPTIONS, undefined),
  wording: boolean(),
  minimum: constantFrom<Proficiency | undefined>(...RANKS, undefined),
  frequency: boolean(),
  spent: boolean(),
});

const rank = record({ skill: constantFrom(...SKILLS), rank: constantFrom(...RANKS) });

const world = record({
  specs: array(spec, { maxLength: MAX_ACTIONS }),
  held: subarray(OPTIONS),
  ranks: array(rank, { maxLength: SKILLS.length }),
});

function candidateOf({ requirement, wording, minimum, frequency }: Spec, index: number): ActionCandidate {
  const data: ActionFields = { cost: 'one', skills: SKILLS };

  if (requirement !== undefined) {
    data.requirements = [requirement];
  }

  if (wording) {
    data.requirementsText = WORDING;
  }

  if (minimum !== undefined) {
    data.minimumProficiency = minimum;
  }

  if (frequency) {
    data.frequency = { max: 1, per: 'round' };
  }

  return {
    id: ContentId.parse(`00000000-0000-4000-8000-${String(index).padStart(ID_DIGITS, '0')}`),
    origin: { kind: ActionOriginKind.Basic },
    action: ActionData.parse(data),
  };
}

function run(
  specs: ReadonlyArray<Spec>,
  held: ReadonlyArray<RollOption>,
  ranks: ReadonlyArray<Rank>,
): ReadonlyArray<AvailableAction> {
  const candidates = specs.map((one, index) => candidateOf(one, index));
  const spent = candidates.filter((_candidate, index) => specs[index]?.spent === true);

  return availableActions({
    candidates,
    facts: new PredicateFacts(held, CORE_NAMESPACES),
    ranks: new Map(ranks.map((one) => [one.skill, one.rank])),
    spent: new Set(spent.map(({ id }) => id)),
    statistics: new Map(),
  });
}

/** The positions of the actions whose requirement is a self option, which holding more options can only satisfy. */
function selfGated(specs: ReadonlyArray<Spec>): ReadonlyArray<number> {
  return specs.flatMap((one, index) => (one.requirement?.startsWith(SELF) === true ? [index] : []));
}

describe('availableActions properties', () => {
  test('an action is plainly available exactly when it gives no reason', () => {
    assert(
      property(world, ({ specs, held, ranks }) => {
        for (const result of run(specs, held, ranks)) {
          expect(result.status === ActionStatus.Available).toBe(result.reasons.length === 0);
        }
      }),
    );
  });

  test('the list has one action per candidate, in order', () => {
    assert(
      property(world, ({ specs, held, ranks }) => {
        expect(run(specs, held, ranks)).toHaveLength(specs.length);
      }),
    );
  });

  test('holding more options never takes away an action a self option gates', () => {
    assert(
      property(world, integer({ min: 0, max: OPTIONS.length }), ({ specs, held, ranks }, extra) => {
        const base = run(specs, held, ranks);
        const more = run(specs, [...new Set([...held, ...OPTIONS.slice(0, extra)])], ranks);

        for (const index of selfGated(specs)) {
          const lost =
            base[index]?.status === ActionStatus.Available && more[index]?.status === ActionStatus.Unavailable;

          expect(lost).toBe(false);
        }
      }),
    );
  });
});
