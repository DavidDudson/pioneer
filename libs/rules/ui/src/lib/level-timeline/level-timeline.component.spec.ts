import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import {
  BARD_TIMELINE,
  FIGHTER_TIMELINE,
  PLANNING_SKILLS_TIMELINE,
  PLANNING_TIMELINE,
} from '../testing/timeline-fixtures';
import type { LevelTimelineRow } from './level-timeline-row';
import { LevelTimeline } from './level-timeline.component';

async function render(rows: readonly LevelTimelineRow[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<LevelTimeline> = TestBed.createComponent(LevelTimeline);
  fixture.componentRef.setInput('rows', rows);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each level as its texts: heading, current marker, then each slot's label, pick and badge. */
function levels(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('pio-level-timeline-level')].map((item) =>
    [...item.querySelectorAll('fr-heading, fr-text, fr-badge')].map((part) => part.textContent.trim()),
  );
}

describe(LevelTimeline, () => {
  it('lists each level with what it opens and what is picked', async () => {
    const shown = levels(await render(FIGHTER_TIMELINE));
    expect(shown.at(0)).toStrictEqual(['Level 1', 'Fighter: Fighter feat', 'Power Attack', 'Chosen']);
    expect(shown.at(3)).toStrictEqual(['Level 4', 'Fighter: Fighter feat', 'Lunge', 'Planned for level 4']);
  });

  it('marks the current level in text and says when a slot is not chosen', async () => {
    const shown = levels(await render(FIGHTER_TIMELINE));
    expect(shown.at(1)).toStrictEqual(['Level 2', 'Current level', 'Fighter: Fighter feat', 'Not chosen']);
  });

  it('says so when a level opens nothing', async () => {
    const shown = levels(await render(FIGHTER_TIMELINE));
    expect(shown.at(2)).toStrictEqual(['Level 3', 'Nothing opens at this level.']);
  });

  it('lists the spell ranks a level opens with what is picked, and a slot not chosen', async () => {
    const shown = levels(await render(BARD_TIMELINE));
    expect(shown.at(0)).toStrictEqual([
      'Level 1',
      '1st rank spell',
      'Force Barrage',
      'Chosen',
      '1st rank spell',
      'Not chosen',
    ]);
    expect(shown.at(2)).toStrictEqual(['Level 3', '2nd rank spell', 'Not chosen']);
  });

  it('offers a picker under a planned slot that can be planned ahead', async () => {
    const host = await render(PLANNING_TIMELINE);
    const shown = [...host.querySelectorAll('pio-level-timeline-level')];
    expect(shown.at(2)?.querySelectorAll('fr-inline-field')).toHaveLength(1);
    expect(shown.at(0)?.querySelectorAll('fr-inline-field')).toHaveLength(0);
  });

  it('offers a skill table and an attribute table under planned skill and boost slots', async () => {
    const host = await render(PLANNING_SKILLS_TIMELINE);
    const shown = [...host.querySelectorAll('pio-level-timeline-level')];
    expect(shown.at(1)?.querySelectorAll('fr-inline-field')).toHaveLength(2);
    expect(host.querySelector('fr-select')).toBeNull();
  });

  it('shows placeholders while loading', async () => {
    const host = await render(undefined);
    expect(host.querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });
});
