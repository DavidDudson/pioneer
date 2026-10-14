import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { RollableStatistic } from '../statistics/statistic-roller';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import {
  CONDITIONAL_STRIKE,
  FAILED_STRIKE,
  FIGHTER_STRIKES,
  NO_DAMAGE_STRIKE,
  STEEL_SHIELD,
  THROWN_STRIKES,
} from '../testing/strike-fixtures';
import { StrikesView } from './strikes.component';
import type { NamedStrike } from './strikes.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(strikes: readonly NamedStrike[] | undefined): Promise<ComponentFixture<StrikesView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', strikes);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<StrikesView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The Strikes' rows, without the breakdowns' own list items. */
function rowsOf(fixture: ComponentFixture<StrikesView>): Element[] {
  return [...hostOf(fixture).querySelectorAll('pio-strike-row')];
}

/** Each row's summary: the name and attack modifier. */
function summariesOf(fixture: ComponentFixture<StrikesView>): string[] {
  return [...hostOf(fixture).querySelectorAll('summary')].map((summary) => textOf(summary));
}

describe(StrikesView, () => {
  it('names each Strike in its summary with its attack modifier', async () => {
    const fixture = await render(FIGHTER_STRIKES);

    expect(summariesOf(fixture)).toStrictEqual(['Longsword +9', 'Dagger +9']);
  });

  it('shows the damage roll: its dice, the flat bonus and the type, a striking rune adding a die', async () => {
    const rows = rowsOf(await render(FIGHTER_STRIKES)).map((row) => textOf(row));

    expect(rows[0]).toContain('1d8+4 slashing');
    expect(rows[1]).toContain('2d4 piercing');
  });

  it('gives an agile weapon the smaller multiple attack penalty', async () => {
    const rows = rowsOf(await render(FIGHTER_STRIKES)).map((row) => textOf(row));

    expect(rows[0]).toContain('Multiple attack penalty -5 / -10');
    expect(rows[1]).toContain('Multiple attack penalty -4 / -8');
  });

  it('shows the attack at each step of the multiple attack penalty, the agile weapon losing less', async () => {
    const rows = rowsOf(await render(FIGHTER_STRIKES)).map((row) => textOf(row));

    expect(rows[0]).toContain('Attack +9 / +4 / -1');
    expect(rows[1]).toContain('Attack +9 / +5 / +1');
  });

  it("names a Strike's traits", async () => {
    const rows = rowsOf(await render(FIGHTER_STRIKES)).map((row) => textOf(row));

    expect(rows[1]).toContain('Agile');
    expect(rows[1]).toContain('Finesse');
  });

  it('words the attack and damage lines that hold only in some situations beneath each', async () => {
    const host = hostOf(await render(CONDITIONAL_STRIKE));
    const captions = [...host.querySelectorAll('pio-statistic-conditions')].map((conditions) => textOf(conditions));

    expect(captions).toStrictEqual([
      '+1 circumstance when you are in darkness (Gloom Walker)',
      '+2 status when you are in darkness (Gloom Walker)',
    ]);
  });

  it('words no conditions for a Strike whose lines all apply', async () => {
    const rows = rowsOf(await render(FIGHTER_STRIKES));

    for (const row of rows) {
      expect(textOf(row)).not.toContain(' when ');
    }
  });

  it('lists a held shield with its Hardness, Hit Points and Broken Threshold', async () => {
    const fixture = await render(FIGHTER_STRIKES);
    fixture.componentRef.setInput('shields', [STEEL_SHIELD]);
    await fixture.whenStable();

    expect(textOf(hostOf(fixture))).toContain('Steel Shield: Hardness 5, HP 20, Broken Threshold 10');
  });

  it('lists a held shield when there are no Strikes', async () => {
    const fixture = await render([]);
    fixture.componentRef.setInput('shields', [STEEL_SHIELD]);
    await fixture.whenStable();

    expect(textOf(hostOf(fixture))).toContain('Steel Shield');
  });

  it('opens to the attack roll and the damage bonus', async () => {
    const fixture = await render(FIGHTER_STRIKES);
    hostOf(fixture).querySelector('summary')?.click();
    await fixture.whenStable();

    expect(textOf(hostOf(fixture))).toContain('Attack roll');
    expect(textOf(hostOf(fixture))).toContain('Damage bonus');
  });

  it('marks a Strike whose attack could not be derived as failed', async () => {
    const fixture = await render(FAILED_STRIKE);

    expect(textOf(hostOf(fixture))).toContain('Failed');
  });

  it('shows a thrown stack range, persistent and splash damage, and how many are left', async () => {
    const fixture = await render(THROWN_STRIKES);
    const [fire] = rowsOf(fixture).map((row) => textOf(row));

    expect(fire).toContain('1d8 fire');
    expect(fire).toContain('Range increment 20 ft');
    expect(fire).toContain('1 persistent fire');
    expect(fire).toContain('1 fire splash');
    expect(fire).toContain('3 in stack');
  });

  it('shows holy water splash in its own type', async () => {
    const fixture = await render(THROWN_STRIKES);
    const water = rowsOf(fixture)
      .map((row) => textOf(row))
      .at(1);

    expect(water).toContain('1 spirit splash');
    expect(water).toContain('1 in stack');
  });

  it('says a weapon with no dice does no damage', async () => {
    const fixture = await render(NO_DAMAGE_STRIKE);

    expect(textOf(hostOf(fixture))).toContain('No damage');
  });

  it('says there are none', async () => {
    const fixture = await render([]);

    expect(textOf(hostOf(fixture))).toContain('No Strikes listed yet');
  });

  it('shows placeholder rows while loading', async () => {
    const fixture = await render(undefined);

    expect(hostOf(fixture).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
  });

  it('rolls a Strike attack from a button beside it, only where the page provides a roller', async () => {
    const rolled: RollableStatistic[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideRulesUiI18nTesting(),
        {
          provide: STATISTIC_ROLLER,
          useValue: {
            roll: (rollable: RollableStatistic): undefined => {
              rolled.push(rollable);
            },
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(StrikesView);
    fixture.componentRef.setInput('strikes', FIGHTER_STRIKES);
    await fixture.whenStable();
    const buttons = hostOf(fixture).querySelectorAll<HTMLButtonElement>('button[aria-label^="Roll "]');

    expect([...buttons].map((button) => button.getAttribute('aria-label'))).toStrictEqual([
      'Roll Longsword',
      'Roll Dagger',
    ]);
    buttons[0]?.click();
    expect(rolled.map(({ name }) => name)).toStrictEqual(['Longsword']);

    TestBed.resetTestingModule();
    const plain = await render(FIGHTER_STRIKES);
    expect(hostOf(plain).querySelectorAll('button[aria-label^="Roll "]')).toHaveLength(0);
  });
});
