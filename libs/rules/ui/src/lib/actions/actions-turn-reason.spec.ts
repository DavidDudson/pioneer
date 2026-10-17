import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionMode } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

const REASON = message('rules.actions.turn.tooFewActions', { count: 2, left: 1 });

/** The first of the standing actions, held back by the turn for want of actions. */
function tooDear(): ActionLine {
  const [first] = STANDING_ACTIONS;
  if (first === undefined) {
    throw new Error('The standing actions are empty');
  }
  return { ...first, affordable: false, reasons: [REASON] };
}

async function render(view: ActionsViewKind): Promise<ComponentFixture<ActionsView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())] });
  const lines = [tooDear()];
  const fixture = TestBed.createComponent(ActionsView);
  fixture.componentRef.setInput('lines', lines);
  fixture.componentRef.setInput('mode', ActionMode.Encounter);
  fixture.componentRef.setInput('view', view);
  await fixture.whenStable();
  return fixture;
}

describe('why the turn cannot pay for an action', () => {
  it('says how many actions it needs and how many are left in the All view', async () => {
    const fixture = await render(ActionsViewKind.All);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Needs 2 actions, 1 left.');
  });
});
