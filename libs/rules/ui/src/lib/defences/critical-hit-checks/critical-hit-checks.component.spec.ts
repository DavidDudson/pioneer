import { TestBed } from '@angular/core/testing';
import { DefenceStatusKind } from '@pioneer/rules/engine';
import type { CriticalHitCheckLine } from '@pioneer/rules/engine';
import { describe, expect, it } from 'vitest';

import { criticalHitCheck, FORTIFIED_ARMOR, FORTIFIED_DEFENCES, OUT_OF_RANGE } from '../../testing/defences-fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { CriticalHitChecks } from './critical-hit-checks.component';
import type { CriticalHitRoll } from './critical-hit-checks.component';

const GREATER_DC = 14;

interface Rendered {
  readonly host: HTMLElement;
  readonly rolls: CriticalHitRoll[];
}

async function render(checks: readonly CriticalHitCheckLine[]): Promise<Rendered> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(CriticalHitChecks);
  const rolls: CriticalHitRoll[] = [];
  fixture.componentInstance.rolled.subscribe((roll) => {
    rolls.push(roll);
  });
  fixture.componentRef.setInput('checks', checks);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, rolls };
}

function buttons(host: HTMLElement): readonly HTMLButtonElement[] {
  return [...host.querySelectorAll('button')];
}

describe(CriticalHitChecks, () => {
  it('words the check from its DC', async () => {
    const { host } = await render(FORTIFIED_DEFENCES.criticalHitChecks);
    expect(host.textContent).toContain('DC 17 flat check');
    expect(host.textContent).toContain('it becomes a normal hit');
  });

  it('gives each check a button naming its DC, and a check with a lower DC keeps its own', async () => {
    const { host } = await render([
      ...FORTIFIED_DEFENCES.criticalHitChecks,
      criticalHitCheck(FORTIFIED_ARMOR, GREATER_DC),
    ]);
    expect(buttons(host).map((button) => button.getAttribute('aria-label'))).toStrictEqual([
      'Roll the DC 17 flat check',
      'Roll the DC 14 flat check',
    ]);
  });

  it('asks for the roll at the DC of the check pressed', async () => {
    const { host, rolls } = await render([
      ...FORTIFIED_DEFENCES.criticalHitChecks,
      criticalHitCheck(FORTIFIED_ARMOR, GREATER_DC),
    ]);
    buttons(host)[1]?.click();
    expect(rolls).toStrictEqual([{ dc: GREATER_DC }]);
  });

  it('leaves out a check that failed', async () => {
    const failed = { ...criticalHitCheck(FORTIFIED_ARMOR, GREATER_DC), status: OUT_OF_RANGE };
    expect(failed.status.kind).toBe(DefenceStatusKind.Failed);
    const { host } = await render([failed]);
    expect(buttons(host)).toStrictEqual([]);
  });
});
