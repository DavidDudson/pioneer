import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { RuleId } from '@pioneer/rules/engine';
import { Selector } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { RollableStatistic, StatisticRoller } from '../statistics/statistic-roller';
import { ENTRY_NAMES } from '../testing/breakdown-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import {
  claimableStrike,
  CONDITIONAL_STRIKE,
  DARKNESS_RULE,
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
      expect.stringMatching(/^Roll Longsword [+-]\d+$/u),
      expect.stringMatching(/^Roll Dagger [+-]\d+$/u),
    ]);
    buttons[0]?.click();
    expect(rolled.map(({ name }) => name)).toStrictEqual(['Longsword']);

    TestBed.resetTestingModule();
    const plain = await render(FIGHTER_STRIKES);
    expect(hostOf(plain).querySelectorAll('button[aria-label^="Roll "]')).toHaveLength(0);
  });
});

interface Claim {
  readonly selector: Selector;
  readonly rule: RuleId;
  readonly on: boolean;
}

async function renderClaiming(
  strikes: readonly NamedStrike[],
  claims: Claim[] | undefined,
): Promise<ComponentFixture<StrikesView>> {
  const roller: StatisticRoller = {
    roll: () => undefined,
    claim: (selector, rule, on) => {
      claims?.push({ selector, rule, on });
    },
  };
  const rolling = claims === undefined ? [] : [{ provide: STATISTIC_ROLLER, useValue: roller }];
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), ...rolling] });
  const fixture = TestBed.createComponent(StrikesView);
  fixture.componentRef.setInput('strikes', strikes);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function toggleOf(fixture: ComponentFixture<StrikesView>): HTMLButtonElement {
  const toggle = hostOf(fixture).querySelector<HTMLButtonElement>('pio-statistic-conditions button');
  if (toggle === null) {
    throw new Error('Expected a situation toggle');
  }
  return toggle;
}

describe('StrikesView situations', () => {
  it('offers an attack line as a toggle that claims its situation for that Strike', async () => {
    const claims: Claim[] = [];
    const fixture = await renderClaiming(claimableStrike(false), claims);

    const toggle = toggleOf(fixture);
    expect(textOf(toggle)).toBe('+1 circumstance when you are in darkness (Gloom Walker)');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();

    expect(claims).toStrictEqual([{ selector: Selector.parse('strike:longsword'), rule: DARKNESS_RULE, on: true }]);
  });

  it('counts a claimed situation in the attack and in each step of the multiple attack penalty', async () => {
    const fixture = await renderClaiming(claimableStrike(true), []);

    expect(toggleOf(fixture).getAttribute('aria-pressed')).toBe('true');
    expect(summariesOf(fixture)).toStrictEqual(['Longsword +10']);
    expect(textOf(hostOf(fixture))).toContain('Attack +10 / +5 / +0');
  });

  it('leaves the attack as it was while the situation is not claimed', async () => {
    const fixture = await renderClaiming(claimableStrike(false), []);

    expect(summariesOf(fixture)).toStrictEqual(['Longsword +9']);
    expect(textOf(hostOf(fixture))).toContain('Attack +9 / +4 / -1');
  });

  it('lets go of a claimed situation when its toggle is flipped back', async () => {
    const claims: Claim[] = [];
    const fixture = await renderClaiming(claimableStrike(true), claims);

    toggleOf(fixture).click();

    expect(claims.map(({ on }) => on)).toStrictEqual([false]);
  });

  it('words the line as plain text where nothing can claim it', async () => {
    const fixture = await renderClaiming(claimableStrike(false), undefined);

    expect(hostOf(fixture).querySelector('pio-statistic-conditions button')).toBeNull();
    expect(textOf(hostOf(fixture))).toContain('+1 circumstance when you are in darkness (Gloom Walker)');
  });
});

describe('StrikesView in a form', () => {
  it('names the weapon Strikes the form replaces beneath the list', async () => {
    const fixture = await render(FIGHTER_STRIKES.slice(0, 1));
    fixture.componentRef.setInput('suppressed', ['Longsword', 'Dagger']);
    await fixture.whenStable();

    expect(textOf(hostOf(fixture))).toContain('Replaced by your form: Longsword, Dagger. The base sheet lists them.');
  });

  it('says nothing out of a form', async () => {
    const fixture = await render(FIGHTER_STRIKES);

    expect(textOf(hostOf(fixture))).not.toContain('Replaced by your form');
  });
});
