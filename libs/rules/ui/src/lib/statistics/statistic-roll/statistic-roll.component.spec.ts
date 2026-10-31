import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { statistic, term } from '../../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticRoll } from './statistic-roll.component';

async function render(total: number): Promise<ComponentFixture<StatisticRoll>> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      { provide: STATISTIC_ROLLER, useValue: { roll: (): undefined => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(StatisticRoll);
  fixture.componentRef.setInput('name', 'Acrobatics');
  fixture.componentRef.setInput('kind', StatisticKind.Check);
  fixture.componentRef.setInput('statistic', statistic('skill:acrobatics', { base: [term(`${total}`, total)] }));
  await fixture.whenStable();
  return fixture;
}

function labelOf(fixture: ComponentFixture<StatisticRoll>): HTMLElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('button[aria-label="Roll Acrobatics"] span');
}

describe(StatisticRoll, () => {
  it('reads the signed modifier it rolls', async () => {
    expect(labelOf(await render(10))?.textContent.trim()).toBe('+10');
  });

  it('reads a penalty with its minus sign', async () => {
    expect(labelOf(await render(-3))?.textContent.trim()).toBe('-3');
  });

  it('keeps the width of "+10" at least and sets the label in monospace, so the buttons line up', async () => {
    const label = labelOf(await render(1));

    expect(label?.classList).toContain('min-w-modifier');
    expect(label?.classList).toContain('font-mono');
  });
});
