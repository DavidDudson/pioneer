import { TestBed } from '@angular/core/testing';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { InventoryMessage } from '../inventory-messages';
import { InventoryBreaks } from './inventory-breaks.component';

/** A reason that reads "Invested", standing in for the sheet's own wording. */
const REASON = message(InventoryMessage.Invested);

async function render(reasons: readonly MessageDescriptor[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(InventoryBreaks);
  fixture.componentRef.setInput('reasons', reasons);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(InventoryBreaks, () => {
  it('shows nothing for an item that breaks no rule', async () => {
    const host = await render([]);
    expect(host.textContent.trim()).toBe('');
  });

  it('shows a warning tag, then a line for each reason', async () => {
    const host = await render([REASON, REASON]);
    expect(host.querySelector('fr-tag')?.textContent.trim()).toBe('Breaks a rule');
    expect([...host.querySelectorAll('fr-text')].map((line) => line.textContent.trim())).toStrictEqual([
      'Invested',
      'Invested',
    ]);
  });
});
