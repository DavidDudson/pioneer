import { TestBed } from '@angular/core/testing';
import { Proficiency } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ProficiencyRankView } from './proficiency-rank.component';

async function render(rank: Proficiency): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ProficiencyRankView);
  fixture.componentRef.setInput('rank', rank);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe(ProficiencyRankView, () => {
  it.each([
    [Proficiency.Untrained, 'U', 'Untrained'],
    [Proficiency.Trained, 'T', 'Trained'],
    [Proficiency.Expert, 'E', 'Expert'],
    [Proficiency.Master, 'M', 'Master'],
    [Proficiency.Legendary, 'L', 'Legendary'],
  ])('shows %s as its letter, read out as its name', async (rank, letter, name) => {
    const host = await render(rank);
    expect(host.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe(letter);
    expect(host.querySelector('.sr-only')?.textContent.trim()).toBe(name);
  });
});
