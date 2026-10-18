import { describe, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionData, ContentId, Trait } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { array, assert, boolean, constantFrom, property, record, subarray } from 'fast-check';

import { ActionOriginKind, ActionStatus, availableActions } from './available-actions';
import type { ActionCandidate, AvailableAction } from './available-actions';
import { battleFormInPlay } from './battle-form';
import { EngineMessage } from './messages';
import { FORM_FACTS, formRule } from './testing/battle-form-fixtures';

const TRAITS = ['auditory', 'linguistic', 'manipulate', 'move', 'concentrate'].map((name) => Trait.parse(name));
const FORM_KEYS = new Set<string>([
  EngineMessage.ActionFormCantCast,
  EngineMessage.ActionFormCantSpeak,
  EngineMessage.ActionFormNoHands,
]);
const ID_DIGITS = 12;
const MAX_ACTIONS = 8;

const flag = constantFrom<boolean | undefined>(true, false, undefined);
const spec = record({ casts: boolean(), traits: subarray(TRAITS) });
const world = record({
  canCast: flag,
  canSpeak: flag,
  hasHands: flag,
  actions: array(spec, { maxLength: MAX_ACTIONS }),
});

/** What the form sets; a flag it leaves out is undefined. */
interface Flags {
  readonly canCast: boolean | undefined;
  readonly canSpeak: boolean | undefined;
  readonly hasHands: boolean | undefined;
}

function candidateOf(each: { casts: boolean; traits: readonly Trait[] }, index: number): ActionCandidate {
  const id = ContentId.parse(`00000000-0000-4000-8000-${String(index + 1).padStart(ID_DIGITS, '0')}`);
  return { id, action: ActionData.parse({}), origin: { kind: ActionOriginKind.Basic }, ...each };
}

function forbids(action: ActionCandidate, flags: Flags): boolean {
  const traits = action.traits ?? [];
  const has = (name: string): boolean => traits.some((trait) => trait === name);
  return (
    (flags.canCast === false && action.casts === true) ||
    (flags.canSpeak === false && (has('auditory') || has('linguistic'))) ||
    (flags.hasHands === false && has('manipulate'))
  );
}

function everyReasonNamesTheForm(result: AvailableAction): boolean {
  return result.reasons.every(({ key, params }) => FORM_KEYS.has(key) && typeof params?.['form'] === 'string');
}

/** The actions weighed under a form that sets `flags`, with the form. */
function weighed(flags: Flags, candidates: readonly ActionCandidate[]): readonly AvailableAction[] {
  const set = Object.fromEntries(Object.entries(flags).filter(([, value]) => value !== undefined));
  return availableActions({
    candidates,
    facts: new PredicateFacts([], CORE_NAMESPACES),
    ranks: new Map(),
    spent: new Set(),
    statistics: new Map(),
    form: battleFormInPlay({ rules: [formRule(set)], facts: FORM_FACTS }),
  });
}

/** Whether the result is unavailable exactly when expected, with a reason that names the form, and none otherwise. */
function saysSo(result: AvailableAction, forbidden: boolean | undefined): boolean {
  const unavailable = result.status === ActionStatus.Unavailable;
  const reasoned = result.reasons.length > 0;
  return unavailable === forbidden && reasoned === forbidden && everyReasonNamesTheForm(result);
}

describe('battle form actions (property)', () => {
  test('an action is unavailable exactly when the form forbids what it needs, and says so, naming the form', () => {
    assert(
      property(world, ({ actions, ...flags }) => {
        const candidates = actions.map((each, index) => candidateOf(each, index));
        const expected = candidates.map((each) => forbids(each, flags));

        return weighed(flags, candidates).every((result, index) => saysSo(result, expected[index]));
      }),
    );
  });
});
