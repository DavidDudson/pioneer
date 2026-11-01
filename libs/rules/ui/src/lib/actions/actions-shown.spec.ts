import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { CONDITIONAL_ACTIONS, STANDING_ACTIONS } from '../testing/action-fixtures';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionWords } from './action-words';

const DARKNESS_LINE = '+1 circumstance when you are in darkness (Gloom Walker)';

function words(): ActionWords {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  return TestBed.inject(ActionWords);
}

function named(lines: readonly ActionLine[], name: string): ActionLine {
  const found = lines.find((candidate) => candidate.name === name);
  if (found === undefined) {
    throw new Error(`No action named ${name}`);
  }
  return found;
}

/** The compact row shows no reasons or conditions; the shown action still words them for the content panel. */
describe('a shown action', () => {
  it('words the roll lines that hold only in some situations', () => {
    const shown = words().shown(named(CONDITIONAL_ACTIONS, 'Grapple'), { entries: ENTRY_NAMES });

    expect(shown.conditions).toContain(DARKNESS_LINE);
  });

  it('words nothing for an action that rolls nothing', () => {
    expect(words().shown(named(CONDITIONAL_ACTIONS, 'Stride')).conditions).toStrictEqual([]);
  });

  it('words why an unusable action cannot be used', () => {
    const shown = words().shown(named(STANDING_ACTIONS, 'Pick a Lock'));

    expect(shown.reasons).toStrictEqual(['Needs trained proficiency in thievery.']);
  });

  it('words the requirements an action cannot test', () => {
    expect(words().shown(named(STANDING_ACTIONS, 'Disable a Device')).reasons).toStrictEqual([
      'Check its requirements before using it.',
    ]);
  });
});
