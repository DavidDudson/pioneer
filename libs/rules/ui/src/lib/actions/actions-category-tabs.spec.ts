import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { SHIELD_RAISED_ACTIONS, STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ActionCategory } from './action-line';
import type { ActionLine } from './action-line';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function inCategory(line: ActionLine, category: ActionCategory): ActionLine {
  return { ...line, category };
}

/** Two basic actions and one spell, so there are two subtabs. */
const KINDS: readonly ActionLine[] = [
  ...STANDING_ACTIONS.slice(0, 2),
  ...SHIELD_RAISED_ACTIONS.slice(0, 1).map((line) => inCategory(line, ActionCategory.Spells)),
];

async function render(lines: readonly ActionLine[]): Promise<ComponentFixture<ActionsView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())] });
  const fixture = TestBed.createComponent(ActionsView);
  fixture.componentRef.setInput('lines', lines);
  fixture.componentRef.setInput('view', ActionsViewKind.All);
  await fixture.whenStable();
  return fixture;
}

function tabsOf(fixture: ComponentFixture<ActionsView>): HTMLElement[] {
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]')];
}

function rowCount(fixture: ComponentFixture<ActionsView>): number {
  return (fixture.nativeElement as HTMLElement).querySelectorAll('pio-action-row').length;
}

describe('ActionsView kind subtabs', () => {
  it('shows a subtab for each kind the character has actions in, and no other', async () => {
    const fixture = await render(KINDS);
    expect(tabsOf(fixture).map((tab) => textOf(tab))).toStrictEqual(['Spells', 'Basic actions']);
  });

  it('is a labelled tablist', async () => {
    const fixture = await render(KINDS);
    const list = (fixture.nativeElement as HTMLElement).querySelector('[role="tablist"]');
    expect(list?.getAttribute('aria-label')).toBe('Kinds of action');
  });

  it('lists the actions of the first kind at first', async () => {
    const fixture = await render(KINDS);
    expect(tabsOf(fixture).map((tab) => tab.getAttribute('aria-selected'))).toStrictEqual(['true', 'false']);
    expect(rowCount(fixture)).toBe(1);
  });

  it('opens the subtab that is pressed and reports it', async () => {
    const fixture = await render(KINDS);
    tabsOf(fixture)[1]?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.category()).toBe(ActionCategory.Basic);
    expect(rowCount(fixture)).toBe(2);
  });

  it('shows no subtabs for one kind, and lists everything', async () => {
    const fixture = await render(STANDING_ACTIONS.map((line) => inCategory(line, ActionCategory.Basic)));
    expect(tabsOf(fixture)).toHaveLength(0);
    expect(rowCount(fixture)).toBe(STANDING_ACTIONS.length);
  });

  it('falls back to the first kind when the open one has no actions', async () => {
    const fixture = await render(KINDS);
    fixture.componentRef.setInput('category', ActionCategory.Strikes);
    await fixture.whenStable();
    expect(tabsOf(fixture)[0]?.getAttribute('aria-selected')).toBe('true');
  });
});
