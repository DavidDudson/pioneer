import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { INVESTMENT_LIMIT, INVESTMENTS } from '../../testing/investment-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import type { Investment } from './investment';
import { InvestmentsView } from './investments.component';

async function render(investments: readonly Investment[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<InvestmentsView> = TestBed.createComponent(InvestmentsView);
  fixture.componentRef.setInput('investments', investments);
  fixture.componentRef.setInput('maximum', INVESTMENT_LIMIT);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each investment's texts: its name, then what it turns on. */
function shown(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('fr-list-item')]
    .filter((item) => item.parentElement?.closest('fr-list-item') === null)
    .map((item) => [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()));
}

describe(InvestmentsView, () => {
  it('counts the investments against the limit', async () => {
    const host = await render(INVESTMENTS);
    expect(host.querySelector('fr-meter')).not.toBeNull();
    expect(host.textContent).toContain('4 of 10 invested');
  });

  it('says what each investment turns on, marking a line that does not count', async () => {
    const [cloak, bracers, ring, stealth] = shown(await render(INVESTMENTS));
    expect(cloak).toStrictEqual(['Cloak of Elvenkind', 'Reflex +1 item', 'Perception +1 item']);
    expect(bracers).toStrictEqual(['Bracers of Armor', 'Armor Class +1 item (Suppressed)']);
    expect(ring).toStrictEqual(['Ring of the Ram', 'Nothing it turns on shows on the sheet yet.']);
    expect(stealth).toStrictEqual(['Ring of Stealth', 'Not worn or held, so it does nothing.']);
  });

  it('shows placeholders while loading, and an empty state with nothing invested', async () => {
    const loading = await render(undefined);
    expect(loading.querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    TestBed.resetTestingModule();
    const empty = await render([]);
    expect(empty.textContent).toContain('Nothing invested.');
  });
});
