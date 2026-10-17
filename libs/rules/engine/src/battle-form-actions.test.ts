import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionData, ContentId, Trait } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';

import { ActionOriginKind, ActionStatus, availableActions } from './available-actions';
import type { ActionCandidate, AvailableAction } from './available-actions';
import { battleFormInPlay } from './battle-form';
import type { FormInPlay } from './battle-form';
import { EngineMessage } from './messages';
import { FORM_FACTS, formRule } from './testing/battle-form-fixtures';

const ACTION = ContentId.parse('00000000-0000-4000-8000-000000000001');

function formWith(flags: object): FormInPlay {
  const form = battleFormInPlay({ rules: [formRule(flags)], facts: FORM_FACTS });
  if (form === undefined) {
    throw new Error('expected a form');
  }
  return form;
}

function weigh(candidate: Pick<ActionCandidate, 'casts' | 'traits'>, form: FormInPlay | undefined): AvailableAction {
  const [first] = availableActions({
    candidates: [{ id: ACTION, action: ActionData.parse({}), origin: { kind: ActionOriginKind.Basic }, ...candidate }],
    facts: new PredicateFacts([], CORE_NAMESPACES),
    ranks: new Map(),
    spent: new Set(),
    statistics: new Map(),
    form,
  });
  if (first === undefined) {
    throw new Error('expected an action');
  }
  return first;
}

const traits = (...names: readonly string[]): readonly Trait[] => names.map((name) => Trait.parse(name));

function keys({ reasons }: AvailableAction): readonly string[] {
  return reasons.map(({ key }) => key);
}

describe('battle form: what the form forbids', () => {
  test('a spell or Cast a Spell is unavailable when the form can’t cast', () => {
    const form = formWith({ canCast: false });
    const result = weigh({ casts: true }, form);

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(result.reasons).toEqual([{ key: EngineMessage.ActionFormCantCast, params: { form: form.origin.entry } }]);
  });

  test.each(['auditory', 'linguistic'])('a %s action is unavailable when the form can’t speak', (trait) => {
    const result = weigh({ traits: traits(trait) }, formWith({ canSpeak: false }));

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(keys(result)).toEqual([EngineMessage.ActionFormCantSpeak]);
  });

  test('a manipulate action is unavailable when the form has no hands', () => {
    const result = weigh({ traits: traits('manipulate') }, formWith({ hasHands: false }));

    expect(result.status).toBe(ActionStatus.Unavailable);
    expect(keys(result)).toEqual([EngineMessage.ActionFormNoHands]);
  });

  test('an action needing several things the form lacks gives each reason', () => {
    const result = weigh({ traits: traits('manipulate', 'auditory') }, formWith({ canSpeak: false, hasHands: false }));

    expect(keys(result)).toEqual([EngineMessage.ActionFormCantSpeak, EngineMessage.ActionFormNoHands]);
  });

  test('a flag the form leaves out, or sets true, forbids nothing', () => {
    const both = { casts: true, traits: traits('manipulate', 'auditory', 'linguistic') };

    expect(weigh(both, formWith({})).status).toBe(ActionStatus.Available);
    expect(weigh(both, formWith({ canCast: true, canSpeak: true, hasHands: true })).status).toBe(
      ActionStatus.Available,
    );
  });

  test('an action the form does not touch, or no form at all, leaves it available', () => {
    const form = formWith({ canCast: false, canSpeak: false, hasHands: false });

    expect(weigh({ traits: traits('move') }, form).status).toBe(ActionStatus.Available);
    expect(weigh({ casts: true, traits: traits('manipulate') }, undefined).status).toBe(ActionStatus.Available);
  });
});
