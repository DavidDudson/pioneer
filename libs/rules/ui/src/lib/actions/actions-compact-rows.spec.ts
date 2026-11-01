import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionMode } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

/** The standing actions renamed so that case and accents decide nothing: "zeal", "Éclair", "apex", "Eclair2". */
const NAMES = ['zeal', 'Éclair', 'apex', 'Eclair2'];

function renamed(): readonly ActionLine[] {
  return NAMES.map((name, index) => {
    const base = STANDING_ACTIONS[index];
    if (base === undefined) {
      throw new Error('The standing actions are too few');
    }
    return { ...base, name };
  });
}

async function render(view: ActionsViewKind): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())] });
  const fixture: ComponentFixture<ActionsView> = TestBed.createComponent(ActionsView);
  fixture.componentRef.setInput('lines', renamed());
  fixture.componentRef.setInput('mode', ActionMode.Encounter);
  fixture.componentRef.setInput('view', view);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function shownNames(host: HTMLElement): readonly string[] {
  return [...host.querySelectorAll('pio-action-row pio-entry-name-cell')].map((cell) => cell.textContent.trim());
}

describe('the compact action rows', () => {
  it('sorts the All view by name, ignoring case and accents', async () => {
    const host = await render(ActionsViewKind.All);
    expect(shownNames(host)).toStrictEqual(['apex', 'Éclair', 'Eclair2', 'zeal']);
  });

  it('sorts by name within each cost group of the Now view', async () => {
    const host = await render(ActionsViewKind.Now);
    const names = shownNames(host);
    expect(names).toHaveLength(NAMES.length);
    for (const group of host.querySelectorAll('pio-action-list')) {
      const inGroup = shownNames(group as HTMLElement);
      expect(inGroup).toStrictEqual(
        inGroup.toSorted((left, right) => left.localeCompare(right, 'en', { sensitivity: 'base' })),
      );
    }
  });

  it('is one line to an action: the name and a roll control only for an action that rolls', async () => {
    const host = await render(ActionsViewKind.All);
    const rows = [...host.querySelectorAll('pio-action-row')];
    expect(rows).toHaveLength(NAMES.length);
    for (const row of rows) {
      expect(row.querySelector('fr-text[variant="caption"]')).toBeNull();
      expect(row.querySelector('pio-chip-list')).toBeNull();
    }
  });
});
