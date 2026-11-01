import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ConditionBadge } from './condition-badge.component';
import { CONDITION_ICONS } from './condition-icons';
import { CONDITIONS_BY_SERIOUSNESS, ConditionSlug } from './condition-seriousness';

async function render(conditions: readonly string[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<ConditionBadge> = TestBed.createComponent(ConditionBadge);
  fixture.componentRef.setInput('conditions', conditions);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(ConditionBadge, () => {
  it('shows nothing without conditions', async () => {
    const host = await render([]);
    expect(host.querySelector('fr-badge')).toBeNull();
  });

  it('shows the most serious condition by name, with no count for one', async () => {
    const host = await render([ConditionSlug.Frightened]);
    expect(host.querySelector('svg title')?.textContent).toBe('Frightened');
    expect(host.textContent).not.toMatch(/\d/u);
  });

  it('shows the worst of several, and how many there are', async () => {
    const host = await render([ConditionSlug.Prone, ConditionSlug.Dying, ConditionSlug.Frightened]);
    expect(host.querySelector('svg title')?.textContent).toBe('Dying');
    expect(host.textContent.trim()).toBe('Dying 3');
  });

  it('names a condition it does not know generically', async () => {
    const host = await render(['homebrew-curse']);
    expect(host.querySelector('svg title')?.textContent).toBe('Condition');
  });

  it('gives every remaster condition its own icon', () => {
    const icons = CONDITIONS_BY_SERIOUSNESS.map((slug) => CONDITION_ICONS[slug]);
    expect(new Set(icons).size).toBe(CONDITIONS_BY_SERIOUSNESS.length);
  });
});
