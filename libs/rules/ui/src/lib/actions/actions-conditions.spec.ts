import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { CONDITIONAL_ACTIONS } from '../testing/action-fixtures';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

const DARKNESS_LINE = '+1 circumstance when you are in darkness (Gloom Walker)';

async function render(view: ActionsViewKind): Promise<ComponentFixture<ActionsView>> {
  TestBed.configureTestingModule({
    providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())],
  });
  const fixture = TestBed.createComponent(ActionsView);
  fixture.componentRef.setInput('lines', CONDITIONAL_ACTIONS);
  fixture.componentRef.setInput('view', view);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

/** The text of the row of the action named `name`. */
function rowText(fixture: ComponentFixture<ActionsView>, name: string): string {
  const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('pio-action-row')];
  const row = rows.find((candidate) => candidate.textContent.trim().startsWith(name));
  return row?.textContent ?? '';
}

describe('ActionsView conditional adjustments', () => {
  it('words the roll lines that hold only in some situations beneath the action, in the Now view', async () => {
    const fixture = await render(ActionsViewKind.Now);

    expect(rowText(fixture, 'Grapple')).toContain(DARKNESS_LINE);
  });

  it('words them in the All view too', async () => {
    const fixture = await render(ActionsViewKind.All);

    expect(rowText(fixture, 'Grapple')).toContain(DARKNESS_LINE);
  });

  it('words nothing for an action that rolls nothing', async () => {
    const fixture = await render(ActionsViewKind.Now);

    expect(rowText(fixture, 'Stride')).not.toContain(' when ');
  });
});
