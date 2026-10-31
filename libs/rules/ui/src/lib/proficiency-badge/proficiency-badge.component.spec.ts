import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Proficiency } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { ProficiencyBadge } from './proficiency-badge.component';
import type { RankSource } from './proficiency-badge.component';

const SOURCES: readonly RankSource[] = [
  { rank: Proficiency.Trained, source: 'Cleric', future: false },
  { rank: Proficiency.Expert, source: 'Level 15 skill increase', level: 15, future: true },
];

async function render(sources: readonly RankSource[]): Promise<ComponentFixture<ProficiencyBadge>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(ProficiencyBadge);
  fixture.componentRef.setInput('rank', Proficiency.Trained);
  fixture.componentRef.setInput('sources', sources);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<ProficiencyBadge>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The popover's lines, once the badge is focused. */
async function opened(fixture: ComponentFixture<ProficiencyBadge>): Promise<readonly string[]> {
  const button = hostOf(fixture).querySelector('button');
  button?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  await fixture.whenStable();
  return [...document.querySelectorAll('[role="tooltip"] fr-list-item')].map((item) => item.textContent.trim());
}

describe(ProficiencyBadge, () => {
  it('is the plain letter, with no button, when nothing gave the rank', async () => {
    const fixture = await render([]);

    expect(hostOf(fixture).querySelector('button')).toBeNull();
    expect(hostOf(fixture).querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe('T');
  });

  it('is a focusable letter, still read out as the rank name, when sources are given', async () => {
    const fixture = await render(SOURCES);
    const host = hostOf(fixture);

    expect(host.querySelector('button')).not.toBeNull();
    expect(host.querySelector('.sr-only')?.textContent.trim()).toBe('Trained');
  });

  it('says on focus what gave the rank, and in grey which rank comes at which level', async () => {
    const fixture = await render(SOURCES);

    await expect(opened(fixture)).resolves.toStrictEqual([
      'Trained: Cleric',
      'Expert at level 15: Level 15 skill increase',
    ]);
    const lines = [...document.querySelectorAll('[role="tooltip"] fr-text')];
    expect(lines[1]?.firstElementChild?.className).not.toBe(lines[0]?.firstElementChild?.className);
  });
});
