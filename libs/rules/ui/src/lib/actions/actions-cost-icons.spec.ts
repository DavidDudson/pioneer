import { TestBed } from '@angular/core/testing';
import { ActionCost, ActionMode } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionWords } from './action-words';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

const [FIRST] = STANDING_ACTIONS;

function line(overrides: Partial<ActionLine>): ActionLine {
  if (FIRST === undefined) {
    throw new Error('The standing actions are empty');
  }
  return { ...FIRST, ...overrides };
}

function words(): ActionWords {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  return TestBed.inject(ActionWords);
}

describe('an action cost as icons', () => {
  it('names a fixed cost by its words', () => {
    expect(words().costIcon(line({ cost: ActionCost.Two, upTo: undefined }))).toStrictEqual({
      cost: ActionCost.Two,
      label: '2 actions',
    });
  });

  it('draws a variable cost as a range named by its ends', () => {
    expect(words().costIcon(line({ cost: ActionCost.One, upTo: 3 }))).toStrictEqual({
      cost: ActionCost.One,
      upTo: ActionCost.Three,
      label: '1 to 3 actions',
    });
  });

  it('draws nothing for a passive action or a range longer than the icons go to', () => {
    const actionWords = words();
    expect(actionWords.costIcon(line({ cost: undefined }))).toBeUndefined();
    expect(actionWords.costIcon(line({ cost: ActionCost.One, upTo: 6 }))).toBeUndefined();
  });

  it('shows the cost as icons in the row, read out as its words', async () => {
    TestBed.configureTestingModule({
      providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())],
    });
    const fixture = TestBed.createComponent(ActionsView);
    fixture.componentRef.setInput('lines', [line({ cost: ActionCost.Two, upTo: undefined })]);
    fixture.componentRef.setInput('mode', ActionMode.Encounter);
    fixture.componentRef.setInput('view', ActionsViewKind.All);
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('fr-action-icon');

    expect(icon?.querySelectorAll('svg')).toHaveLength(2);
    expect(icon?.querySelector('.sr-only')?.textContent).toBe('2 actions');
  });
});
