import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { RollEffectStatusKind } from '@pioneer/rules/engine';
import type {
  BreakdownLine,
  DegreeAdjustmentLine,
  RollEffects,
  RollTwiceLine,
  StatisticValue,
} from '@pioneer/rules/engine';
import { DegreeChange, ModifierType, RollKept, StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  IN_DARKNESS,
  line,
  ruleId,
  statistic,
  STEADY_GRIP,
  SURE_FOOTING,
  term,
} from '../../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { STATISTIC_ROLLER } from '../statistic-roller';
import { StatisticRoll } from './statistic-roll.component';

async function renderStatistic(value: StatisticValue): Promise<ComponentFixture<StatisticRoll>> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      { provide: STATISTIC_ROLLER, useValue: { roll: (): undefined => undefined } },
    ],
  });
  const fixture = TestBed.createComponent(StatisticRoll);
  fixture.componentRef.setInput('name', 'Acrobatics');
  fixture.componentRef.setInput('kind', StatisticKind.Check);
  fixture.componentRef.setInput('statistic', value);
  await fixture.whenStable();
  return fixture;
}

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
  return (fixture.nativeElement as HTMLElement).querySelector('button[aria-label^="Roll Acrobatics"] span');
}

/** The roll button of a check with the given lines and roll effects. */
async function renderCues(
  lines: readonly BreakdownLine[],
  rollEffects?: RollEffects,
): Promise<HTMLButtonElement | null> {
  const base = statistic('skill:acrobatics', { base: [term('5', 5)], lines });
  const fixture = await renderStatistic(rollEffects === undefined ? base : { ...base, rollEffects });
  return (fixture.nativeElement as HTMLElement).querySelector('button');
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

  describe('cues', () => {
    const BONUS = line(STEADY_GRIP, { type: ModifierType.Status, value: 2 });
    const PENALTY = line(STEADY_GRIP, { type: ModifierType.Status, value: -2 });
    const CONDITIONAL = line(STEADY_GRIP, { type: ModifierType.Status, value: 2, status: IN_DARKNESS });
    const FORTUNE: RollTwiceLine = {
      id: ruleId(STEADY_GRIP, 1),
      label: { entry: STEADY_GRIP },
      keep: RollKept.Higher,
      status: { kind: RollEffectStatusKind.Applied },
    };
    const SHIFT: DegreeAdjustmentLine = {
      id: ruleId(SURE_FOOTING, 1),
      label: { entry: SURE_FOOTING },
      adjustment: { success: DegreeChange.OneDegreeBetter },
      status: { kind: RollEffectStatusKind.Applied },
    };

    it('is neutral with nothing to show', async () => {
      const button = await renderCues([]);

      expect(button?.classList).toContain('bg-surface-sunken');
      expect(button?.textContent.trim()).toBe('+5');
    });

    it('colours the text green for a bonus', async () => {
      const button = await renderCues([BONUS]);

      expect(button?.classList).toContain('text-roll-bonus-fg');
    });

    it('colours the text red for a penalty', async () => {
      const button = await renderCues([PENALTY]);

      expect(button?.classList).toContain('text-roll-penalty-fg');
    });

    it('adds an asterisk and says so to screen readers when a line is conditional', async () => {
      const button = await renderCues([CONDITIONAL]);

      expect(button?.textContent.trim()).toBe('+5*');
      expect(button?.getAttribute('aria-label')).toContain('in some situations');
    });

    it('fills the background for fortune', async () => {
      const button = await renderCues([], { rollTwice: [FORTUNE], degreeAdjustments: [] });

      expect(button?.classList).toContain('bg-roll-fortune-bg');
    });

    it('colours the border for a shifted degree', async () => {
      const button = await renderCues([], { rollTwice: [], degreeAdjustments: [SHIFT] });

      expect(button?.classList).toContain('border-roll-degree-line');
    });
  });
});
