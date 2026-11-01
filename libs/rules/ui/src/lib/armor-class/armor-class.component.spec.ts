import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { FIGHTER_VITALS, UNARMORED_VITALS } from '../testing/vitals-fixtures';
import type { Vital } from '../vitals/vital';
import { ArmorClass } from './armor-class.component';

async function render(vital: Vital | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ArmorClass);
  fixture.componentRef.setInput('vital', vital);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected the block to render the element');
  }
  return value;
}

function textOf(element: Element | null | undefined): string | undefined {
  return element?.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe(ArmorClass, () => {
  it('shows nothing while the vital loads', async () => {
    const host = await render(undefined);
    expect(host.querySelector('fr-stack')).toBeNull();
  });

  it('shows its name, its total large and its rank read out by name', async () => {
    const host = await render(FIGHTER_VITALS[0]);
    expect(textOf(host)).toContain('Armor Class');
    const total = present(host.querySelector('fr-text[variant="display"]'));
    const rank = present(host.querySelector('pio-proficiency-rank .sr-only'));
    expect(textOf(total)).toBe('20');
    expect(textOf(rank)).toBe('Trained');
  });

  it('has the rank badge note the armour that sets it', async () => {
    const host = await render(FIGHTER_VITALS[0]);
    present(host.querySelector('pio-proficiency-badge button')).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Breastplate');
    });
  });

  it('says unarmored out of armour', async () => {
    const host = await render(UNARMORED_VITALS[0]);
    present(host.querySelector('pio-proficiency-badge button')).dispatchEvent(
      new FocusEvent('focusin', { bubbles: true }),
    );
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Unarmored');
    });
  });
});
