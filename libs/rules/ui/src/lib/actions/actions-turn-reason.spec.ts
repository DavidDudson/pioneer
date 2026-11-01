import { TestBed } from '@angular/core/testing';
import { message } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionWords } from './action-words';

const REASON = message('rules.actions.turn.tooFewActions', { count: 2, left: 1 });

/** The first of the standing actions, held back by the turn for want of actions. */
function tooDear(): ActionLine {
  const [first] = STANDING_ACTIONS;
  if (first === undefined) {
    throw new Error('The standing actions are empty');
  }
  return { ...first, affordable: false, reasons: [REASON] };
}

describe('why the turn cannot pay for an action', () => {
  it('says how many actions it needs and how many are left', () => {
    TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
    const shown = TestBed.inject(ActionWords).shown(tooDear());

    expect(shown.reasons).toStrictEqual(['Needs 2 actions, 1 left.']);
  });
});
