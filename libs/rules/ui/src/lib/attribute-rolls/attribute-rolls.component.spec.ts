import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { StatisticValue } from '@pioneer/rules/engine';
import type { Attribute } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { RollableStatistic } from '../statistics/statistic-roller';
import { FIGHTER_CHECKS } from '../testing/attributes-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { AttributeRolls } from './attribute-rolls.component';

interface Rendered {
  readonly host: HTMLElement;
  readonly rolls: RollableStatistic[];
}

async function render(statistics: ReadonlyMap<Attribute, StatisticValue> | undefined): Promise<Rendered> {
  const rolls: RollableStatistic[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      {
        provide: STATISTIC_ROLLER,
        useValue: {
          roll: (rollable: RollableStatistic): void => {
            rolls.push(rollable);
          },
        },
      },
    ],
  });
  const fixture: ComponentFixture<AttributeRolls> = TestBed.createComponent(AttributeRolls);
  fixture.componentRef.setInput('statistics', statistics);
  await fixture.whenStable();
  return { host: fixture.nativeElement as HTMLElement, rolls };
}

describe(AttributeRolls, () => {
  it('shows each attribute and its signed modifier on one row', async () => {
    const { host } = await render(FIGHTER_CHECKS);
    const rows = [...host.querySelectorAll('fr-stack fr-stack')].map((row) => row.textContent.replaceAll(/\s+/gu, ''));
    expect(rows).toStrictEqual(['Str+4', 'Dex+2', 'Con+0', 'Int+1', 'Wis+1', 'Cha+0']);
  });

  it('shows a placeholder for each check while they load', async () => {
    const { host } = await render(undefined);
    expect(host.querySelectorAll('fr-skeleton')).toHaveLength(6);
    expect(host.querySelectorAll('button')).toHaveLength(0);
  });

  it('rolls the statistic of the attribute pressed', async () => {
    const { host, rolls } = await render(FIGHTER_CHECKS);
    host.querySelector('button')?.click();
    expect(rolls).toHaveLength(1);
    expect(rolls[0]?.name).toBe('Strength');
    expect(rolls[0]?.statistic.selector).toBe('attribute:str');
  });
});
