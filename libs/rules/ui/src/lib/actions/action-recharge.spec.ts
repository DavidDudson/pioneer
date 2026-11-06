import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FrequencyPeriod } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../entry-preview/entry-preview';
import { SHIELD_BLOCK_SUMMARY } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ActionRow } from './action-row.component';
import { ActionWords } from './action-words';

const NOTES: Readonly<Record<FrequencyPeriod, string>> = {
  [FrequencyPeriod.Turn]: 'Next turn.',
  [FrequencyPeriod.Round]: 'Next round.',
  [FrequencyPeriod.Minute]: 'After a minute or a rest.',
  [FrequencyPeriod.TenMinutes]: 'After 10 minutes or a rest.',
  [FrequencyPeriod.Hour]: 'After an hour or a rest.',
  [FrequencyPeriod.TwentyFourHours]: '24 hours after it was used.',
  [FrequencyPeriod.Day]: 'At the next daily preparation.',
  [FrequencyPeriod.Week]: 'A week after it was used.',
  [FrequencyPeriod.Month]: 'A month after it was used.',
  [FrequencyPeriod.Year]: 'A year after it was used.',
};

function render(recharge: FrequencyPeriod | undefined): ComponentFixture<ActionRow> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideRouter([]),
      provideEntryPreviews({ preview: (): undefined => undefined, panel: () => undefined }),
    ],
  });
  const fixture = TestBed.createComponent(ActionRow);
  fixture.componentRef.setInput(
    'action',
    TestBed.inject(ActionWords).shown({ ...SHIELD_BLOCK_SUMMARY.line, recharge }),
  );
  fixture.detectChanges();
  return fixture;
}

/** The text of the hover summary after focus reaches the row's name. */
async function summaryText(fixture: ComponentFixture<ActionRow>): Promise<string> {
  const name = (fixture.nativeElement as HTMLElement).querySelector('[tabindex="0"], a');
  name?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  return vi.waitFor(() => {
    fixture.detectChanges();
    const card = document.querySelector<HTMLElement>('[role="tooltip"]');
    expect(card).not.toBeNull();
    return card?.textContent ?? '';
  });
}

describe('ActionRow recharge note', () => {
  it.each(Object.values(FrequencyPeriod))(
    'says when a spent action refreshing per %s can be used again',
    async (per) => {
      const text = await summaryText(render(per));
      expect(text).toContain('Usable again');
      expect(text).toContain(NOTES[per]);
    },
  );

  it('shows no note for an action that can be used now', async () => {
    await expect(summaryText(render(undefined))).resolves.not.toContain('Usable again');
  });
});
