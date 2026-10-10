import type { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it, vi } from 'vitest';

import { CORE_RULES } from '../statistic-sources';
import type { LoadCoreRules } from '../statistic-sources';
import { chooseSchema, openPlayground, pageText, present } from './playground-harness';

const WITHOUT_LEVEL = 'Proficiency Without Level';

/** A load of the core rules pack that fails, as a lost chunk would. */
const failing: LoadCoreRules = async () => {
  throw new Error('chunk failed to load');
};

/** The toggle button that turns the variant on and off. */
function toggle(harness: RouterTestingHarness): HTMLButtonElement {
  const buttons = [
    ...present(harness.routeNativeElement).querySelectorAll<HTMLButtonElement>('fr-toggle-button button'),
  ];
  return present(buttons.find((button) => button.textContent.trim() === WITHOUT_LEVEL));
}

async function openStatistics(): Promise<RouterTestingHarness> {
  const harness = await openPlayground();
  await chooseSchema(harness, 'Statistics');
  await vi.waitFor(() => {
    expect(pageText(harness)).toContain('spell-dc:arcane');
  });
  return harness;
}

describe('RulesPlaygroundPage Proficiency Without Level', () => {
  it('derives with the core pack table, then without level once toggled on, naming the variant', async () => {
    const harness = await openStatistics();
    // The example's AC: 10, Dexterity capped at 1, trained at level 3 (2 + 3).
    expect(pageText(harness)).toContain('Base 16');
    expect(pageText(harness)).not.toContain('set by the variant rule');

    toggle(harness).click();
    await harness.fixture.whenStable();

    const text = pageText(harness);
    expect(text).toContain('Base 13');
    expect(text).toContain(`set by the variant rule ${WITHOUT_LEVEL}`);
    expect(toggle(harness).getAttribute('aria-pressed')).toBe('true');
  });

  it('says so and keeps the variant off when the core rules pack fails to load', async () => {
    const harness = await openPlayground([{ provide: CORE_RULES, useValue: failing }]);
    await chooseSchema(harness, 'Statistics');
    await vi.waitFor(() => {
      expect(pageText(harness)).toContain('The core rules pack did not load');
    });
    expect(toggle(harness).disabled).toBe(true);
    expect(pageText(harness)).not.toContain('spell-dc:arcane');
  });
});
