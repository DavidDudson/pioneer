import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { Proficiency, StatisticKind } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  CONDITIONAL_STATISTICS,
  CYCLE,
  ENTRY_NAMES,
  FIGHTER_FORTITUDE,
  FIGHTER_STATISTICS,
  GLOOM_WALKER,
} from '../testing/breakdown-fixtures';
import { BEATEN_STATISTICS } from '../testing/conditional-fixtures';
import { FORM_STATISTICS } from '../testing/form-fixtures';
import { PINNED_STATISTICS, PINNED_WILL } from '../testing/override-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import { STATISTIC_ROLLER } from './statistic-roller';
import type { RollableStatistic, StatisticRoller } from './statistic-roller';
import { StatisticsMessage } from './statistics-messages';
import type { NamedStatistic } from './statistics.component';
import { StatisticsView } from './statistics.component';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

async function render(statistics: readonly NamedStatistic[] | undefined): Promise<ComponentFixture<StatisticsView>> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', statistics);
  fixture.componentRef.setInput('entryNames', ENTRY_NAMES);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<StatisticsView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** An item's texts and badges in order, joined with " | " so the parts stay apart. */
function partsOf(element: Element): string {
  return [...element.querySelectorAll('fr-text, fr-badge')]
    .filter((part) => part.querySelector('fr-text, fr-badge') === null)
    .map((part) => textOf(part))
    .join(' | ');
}

/** The statistics' rows, without the breakdowns' own list items. */
function itemsOf(host: HTMLElement): Element[] {
  return [...host.querySelectorAll('[role="listitem"]')].filter((item) => item.closest('pio-breakdown') === null);
}

/** Each row as read: a disclosure's summary, which names what it opens, or a failure's parts. */
function rows(host: HTMLElement): string[] {
  return itemsOf(host).map((item) => {
    const summary = item.querySelector('summary');
    return summary === null ? partsOf(item) : textOf(summary);
  });
}

/** Each row's conditional lines, as summarised under its disclosure. */
function conditions(host: HTMLElement): string[][] {
  return itemsOf(host).map((item) =>
    [...item.querySelectorAll('pio-statistic-conditions fr-text')].map((part) => textOf(part)),
  );
}

/** Fortitude, ranked. */
function ranked(rank: Proficiency): NamedStatistic {
  return { name: 'Fortitude', kind: StatisticKind.Check, result: FIGHTER_FORTITUDE, rank };
}

/** A roller that records what it is asked to roll. */
function recordingRoller(rolled: RollableStatistic[]): StatisticRoller {
  return {
    roll: (rollable: RollableStatistic): void => {
      rolled.push(rollable);
    },
  };
}

async function renderWithRoller(rolled: RollableStatistic[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [provideRulesUiI18nTesting(), { provide: STATISTIC_ROLLER, useValue: recordingRoller(rolled) }],
  });
  const fixture = TestBed.createComponent(StatisticsView);
  fixture.componentRef.setInput('statistics', FIGHTER_STATISTICS);
  await fixture.whenStable();
  return hostOf(fixture);
}

describe(StatisticsView, () => {
  it('names each statistic in its summary with its total, a check signed and a DC plain', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 20', 'Fortitude +10', 'Will +6']);
  });

  it("shows a statistic's note beside its row, and none beside the others", async () => {
    const [first, ...rest] = FIGHTER_STATISTICS as [NamedStatistic, ...NamedStatistic[]];
    const note = 'Trained by Acolyte and Cleric; the second training is lost';
    const host = hostOf(await render([{ ...first, note }, ...rest]));

    const [noted, plain] = itemsOf(host);
    expect(textOf(present(noted)).endsWith(note)).toBe(true);
    expect(textOf(present(plain))).not.toContain('Trained by');
  });

  it('marks a pinned total in its summary, with the computed value beside it', async () => {
    const host = hostOf(await render(PINNED_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 22 Pinned computed 20', 'Fortitude +10', 'Will +6']);
  });

  it('signs a pinned check and its computed value', async () => {
    const host = hostOf(await render([{ name: 'Will', kind: StatisticKind.Check, result: PINNED_WILL }]));

    expect(rows(host)).toStrictEqual(['Will +9 Pinned computed +6']);
  });

  it('summarises a conditional line under its total, with when it holds and where it comes from', async () => {
    const host = hostOf(await render(CONDITIONAL_STATISTICS));

    expect(rows(host).at(-1)).toBe('Stealth +9');
    expect(conditions(host).at(-1)).toStrictEqual([
      '+1 circumstance when you are in darkness (Gloom Walker)',
      '+2 status in some situations (Unseen)',
    ]);
  });

  it('leaves lines that apply, lose, are inactive or failed out of the summary', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(conditions(host)).toStrictEqual([['+2 circumstance when your shield is raised (Steel Shield)'], [], []]);
  });

  it('leaves out a conditional line an applied one of its type already beats, and says why in the breakdown', async () => {
    const fixture = await render(BEATEN_STATISTICS);
    const athletics = present(hostOf(fixture).querySelector('details'));

    expect(conditions(hostOf(fixture))).toStrictEqual([['+2 circumstance when you Climb (Sure Footing)']]);

    present(athletics.querySelector('summary')).click();
    await fixture.whenStable();

    const breakdown = present(athletics.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Applies when you Climb, but Steady Grip already counts for as much.');
  });

  it('keeps conditional lines out of the summary, so the toggle is named by statistic and total alone', async () => {
    const host = hostOf(await render(CONDITIONAL_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 20', 'Fortitude +10', 'Will +6', 'Stealth +9']);
  });

  it('names a conditional line by its entry id when the entry has no display name', async () => {
    const fixture = await render(CONDITIONAL_STATISTICS);
    fixture.componentRef.setInput('entryNames', new Map());
    await fixture.whenStable();

    expect(conditions(hostOf(fixture)).at(-1)?.[0]).toBe(`+1 circumstance when you are in darkness (${GLOOM_WALKER})`);
  });

  it('names the set override that pinned a total in its breakdown', async () => {
    const fixture = await render(PINNED_STATISTICS);
    const ac = present(hostOf(fixture).querySelector('details'));

    present(ac.querySelector('summary')).click();
    await fixture.whenStable();

    const breakdown = present(ac.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Set by the GM pins it to 22; computed 20.');
  });

  it('expands a total in place to its breakdown', async () => {
    const fixture = await render(FIGHTER_STATISTICS);
    const ac = present(hostOf(fixture).querySelector('details'));
    expect(ac.open).toBe(false);

    present(ac.querySelector('summary')).click();
    await fixture.whenStable();

    expect(ac.open).toBe(true);
    const breakdown = present(ac.querySelector('pio-breakdown'));
    expect(textOf(breakdown)).toContain('Breastplate counts instead.');
  });

  it('marks a statistic the engine could not derive as failed, with why', async () => {
    const host = hostOf(await render([{ name: 'Perception', kind: StatisticKind.Check, result: CYCLE }]));

    expect(rows(host)).toStrictEqual([
      'Perception | Failed | “@stat.save:will” at position 1 closes a loop: perception, save:will depend on one another.',
    ]);
    expect(host.querySelector('details')).toBeNull();
  });

  it('says so when there are no statistics', async () => {
    const host = hostOf(await render([]));

    const empty = present(host.querySelector('fr-empty-state'));
    expect(textOf(empty)).toBe('No statistics.');
  });

  it('says what the caller lists is empty, when it names that', async () => {
    const fixture = await render([]);
    fixture.componentRef.setInput('noneKey', StatisticsMessage.NoStrikes);
    await fixture.whenStable();

    const empty = present(hostOf(fixture).querySelector('fr-empty-state'));
    expect(textOf(empty)).toBe('No Strikes listed yet. Hold a weapon to add its Strike.');
  });

  it('names a statistic by its message key when it has one, as a fist Strike', async () => {
    const [armorClass] = FIGHTER_STATISTICS;
    const fist = { ...present(armorClass), name: 'fist', nameKey: StatisticsMessage.Fist };
    const host = hostOf(await render([fist]));

    expect(rows(host)).toStrictEqual(['Fist 20']);
  });

  it('shows a placeholder row per statistic while loading', async () => {
    const host = hostOf(await render(undefined));

    expect(host.querySelectorAll('details')).toHaveLength(0);
    expect(host.querySelectorAll('[role="listitem"] fr-skeleton')).toHaveLength(5);
  });

  describe('rolling', () => {
    it('offers no roll button where the page provides no roller', async () => {
      const host = hostOf(await render(FIGHTER_STATISTICS));

      expect(host.querySelectorAll('button[aria-label^="Roll "]')).toHaveLength(0);
    });

    it('offers a roll button on each check, not on a DC or a value, naming what it rolls', async () => {
      const host = await renderWithRoller([]);
      const checks = FIGHTER_STATISTICS.filter(({ kind }) => kind === StatisticKind.Check).map(
        ({ name }) => `Roll ${name}`,
      );
      const labels = [...host.querySelectorAll('button[aria-label^="Roll "]')].map((button) =>
        button.getAttribute('aria-label'),
      );

      expect(checks.length).toBeGreaterThan(0);
      expect(labels).toStrictEqual(checks);
    });

    it('hands the roller the statistic it was pressed on', async () => {
      const rolled: RollableStatistic[] = [];
      const host = await renderWithRoller(rolled);
      const check = FIGHTER_STATISTICS.find(({ kind }) => kind === StatisticKind.Check);

      present(host.querySelector<HTMLButtonElement>(`button[aria-label="Roll ${check?.name}"]`)).click();

      expect(rolled.map(({ name }) => name)).toStrictEqual([check?.name]);
      expect(rolled[0]?.statistic).toBe(check?.result);
    });
  });

  it('shows a rank as its letter beside the name, read out as the rank name', async () => {
    const host = hostOf(await render([ranked(Proficiency.Expert)]));

    const rank = present(itemsOf(host)[0]?.querySelector('pio-proficiency-rank'));
    expect(rank.querySelector('[aria-hidden="true"]')?.textContent.trim()).toBe('E');
    expect(rank.querySelector('.sr-only')?.textContent.trim()).toBe('Expert');
  });

  it('shows no rank on a statistic that has none', async () => {
    const host = hostOf(await render(FIGHTER_STATISTICS));

    expect(host.querySelector('pio-proficiency-rank fr-glyph')).toBeNull();
  });

  it('marks a total a battle form sets as from the form, and leaves a higher own value plain', async () => {
    const host = hostOf(await render(FORM_STATISTICS));

    expect(rows(host)).toStrictEqual(['Armor Class 10 from Golem Form', 'Fortitude +10']);
  });
});
