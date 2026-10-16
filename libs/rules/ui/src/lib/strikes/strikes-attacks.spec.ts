import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_STRIKES } from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';

async function render(attacksMade: number | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideTanStackQuery(new QueryClient())] });
  const fixture: ComponentFixture<StrikesView> = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', FIGHTER_STRIKES);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  fixture.componentRef.setInput('attacksMade', attacksMade);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** The three modifiers of the first Strike's "Attack +9 / +4 / -1" line. */
function steps(page: HTMLElement): string[] {
  const line = [...page.querySelectorAll('fr-text')]
    .map((text) => text.textContent.trim())
    .find((text) => text.startsWith('Attack ') && text.includes(' / '));
  return line?.replace('Attack ', '').split(' / ') ?? [];
}

function marked(page: HTMLElement): string | undefined {
  return [...page.querySelectorAll('pio-strike-row fr-text')]
    .map((text) => text.textContent.trim())
    .find((text) => text.startsWith('Next attack:'));
}

describe('the next step of the multiple attack penalty', () => {
  it('marks the first step before any attack is made', async () => {
    const page = await render(0);
    expect(marked(page)).toBe(`Next attack: ${steps(page)[0]}`);
  });

  it('marks the second step after one attack and the third after two', async () => {
    const one = await render(1);
    expect(marked(one)).toBe(`Next attack: ${steps(one)[1]}`);
    TestBed.resetTestingModule();
    const two = await render(2);
    expect(marked(two)).toBe(`Next attack: ${steps(two)[2]}`);
  });

  it('keeps the third step for every later attack', async () => {
    const page = await render(7);
    expect(marked(page)).toBe(`Next attack: ${steps(page)[2]}`);
  });

  it('marks nothing when no turn is counting attacks', async () => {
    const page = await render(undefined);
    expect(marked(page)).toBeUndefined();
  });
});
