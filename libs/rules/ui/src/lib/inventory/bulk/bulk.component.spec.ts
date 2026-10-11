import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { ENCUMBERED_LOAD, LIGHT_LOAD, OVER_MAXIMUM_LOAD } from '../../testing/bulk-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { BulkView } from './bulk.component';
import type { CarriedBulk } from './carried-bulk';

async function render(bulk: CarriedBulk | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<BulkView> = TestBed.createComponent(BulkView);
  fixture.componentRef.setInput('bulk', bulk);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function meter(host: HTMLElement): HTMLMeterElement {
  const found = host.querySelector('meter');
  if (found === null) {
    throw new Error('No meter');
  }
  return found;
}

describe(BulkView, () => {
  it('meters whole Bulk up to the maximum and states the Bulk carried and the limits in words', async () => {
    const host = await render(LIGHT_LOAD);
    const { value, max } = meter(host);
    expect([meter(host).getAttribute('aria-label'), value, max]).toStrictEqual(['Bulk carried', 6, 12]);
    expect(host.textContent).toContain('Carrying 6 Bulk and 3 light items');
    expect(host.textContent).toContain('Encumbered over 7 Bulk; can carry no more than 12 Bulk.');
    expect(host.querySelector('fr-badge')).toBeNull();
  });

  it('marks a character encumbered, or over its maximum', async () => {
    const encumbered = await render(ENCUMBERED_LOAD);
    expect(encumbered.querySelector('fr-badge')?.textContent.trim()).toBe('Encumbered');
    expect(encumbered.textContent).toContain('Carrying 9 Bulk');
    TestBed.resetTestingModule();
    const over = await render(OVER_MAXIMUM_LOAD);
    expect(over.querySelector('fr-badge')?.textContent.trim()).toBe('Over the maximum');
    expect(over.textContent).toContain('Carrying 14 Bulk and 1 light item');
  });

  it('shows a placeholder while the Bulk loads', async () => {
    const host = await render(undefined);
    expect(host.querySelector('fr-skeleton')).not.toBeNull();
    expect(host.querySelector('meter')).toBeNull();
  });
});
