import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionMode } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { RollableStatistic, StatisticRoller } from '../statistics/statistic-roller';
import { GRABBED_ACTIONS, PRONE_ACTIONS, SHIELD_RAISED_ACTIONS, STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

interface Options {
  readonly mode?: ActionMode;
  readonly view?: ActionsViewKind;
  readonly roller?: StatisticRoller;
}

async function render(
  lines: readonly ActionLine[] | undefined,
  { mode = ActionMode.Encounter, view = ActionsViewKind.Now, roller }: Options = {},
): Promise<ComponentFixture<ActionsView>> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      ...(roller === undefined ? [] : [{ provide: STATISTIC_ROLLER, useValue: roller }]),
    ],
  });
  const fixture = TestBed.createComponent(ActionsView);
  fixture.componentRef.setInput('lines', lines);
  fixture.componentRef.setInput('mode', mode);
  fixture.componentRef.setInput('view', view);
  await fixture.whenStable();
  return fixture;
}

function hostOf(fixture: ComponentFixture<ActionsView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

/** The names of the rows in the order shown. */
function namesOf(fixture: ComponentFixture<ActionsView>): string[] {
  return [...hostOf(fixture).querySelectorAll('pio-action-row')].map((row) =>
    textOf(row.querySelector('fr-text') ?? row),
  );
}

function headingsOf(fixture: ComponentFixture<ActionsView>): string[] {
  return [...hostOf(fixture).querySelectorAll('h3')].map((heading) => textOf(heading));
}

function rowText(fixture: ComponentFixture<ActionsView>, name: string): string {
  const row = [...hostOf(fixture).querySelectorAll('pio-action-row')].find((candidate) =>
    textOf(candidate).startsWith(name),
  );
  return row === undefined ? '' : textOf(row);
}

function press(fixture: ComponentFixture<ActionsView>, label: string): void {
  const button = [...hostOf(fixture).querySelectorAll('button')].find((candidate) => textOf(candidate) === label);
  button?.click();
}

describe(ActionsView, () => {
  describe('the Now view', () => {
    it('lists the usable actions of the mode grouped by cost, leaving out those that cannot be used', async () => {
      const fixture = await render(STANDING_ACTIONS);

      expect(headingsOf(fixture)).toStrictEqual(['1 action', '2 actions']);
      expect(namesOf(fixture)).toStrictEqual([
        'Stride',
        'Stand',
        'Escape',
        'Demoralize',
        'Grapple',
        'Disable a Device',
      ]);
    });

    it('marks an action with requirements it cannot test, and leaves the unusable and dormant ones out', async () => {
      const fixture = await render(STANDING_ACTIONS);
      const text = textOf(hostOf(fixture));

      expect(rowText(fixture, 'Disable a Device')).toContain('Check its requirements before using it.');
      expect(text).not.toContain('Pick a Lock');
      expect(text).not.toContain('Shield Block');
    });

    it('puts Stand and Crawl first when prone, the most pressing first', async () => {
      const fixture = await render(PRONE_ACTIONS);

      expect(namesOf(fixture).slice(0, 2)).toStrictEqual(['Stand', 'Crawl']);
    });

    it('puts Escape first when grabbed, ahead of the other actions of its cost', async () => {
      const fixture = await render(GRABBED_ACTIONS);

      expect(namesOf(fixture)[0]).toBe('Escape');
    });

    it('enables Shield Block while a shield is raised', async () => {
      const fixture = await render(SHIELD_RAISED_ACTIONS);

      expect(headingsOf(fixture)).toStrictEqual(['Reaction', '1 action']);
      expect(namesOf(fixture)).toStrictEqual(['Shield Block', 'Stride']);
    });

    it('follows the sheet mode: downtime lists the downtime actions, with no cost', async () => {
      const fixture = await render(STANDING_ACTIONS, { mode: ActionMode.Downtime });

      expect(headingsOf(fixture)).toStrictEqual(['No cost']);
      expect(namesOf(fixture)).toStrictEqual(['Earn Income']);
    });

    it('says so when nothing can be done', async () => {
      const fixture = await render([]);

      expect(textOf(hostOf(fixture))).toContain('Nothing to do right now.');
    });

    it('shows placeholder rows while the actions load', async () => {
      const fixture = await render(undefined);

      expect(hostOf(fixture).querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    });
  });

  describe('the All view', () => {
    it('lists every action with its status, and the reason an unusable one is', async () => {
      const fixture = await render(STANDING_ACTIONS, { view: ActionsViewKind.All });

      expect(namesOf(fixture)).toHaveLength(STANDING_ACTIONS.length);
      expect(rowText(fixture, 'Pick a Lock')).toContain('Unavailable');
      expect(rowText(fixture, 'Pick a Lock')).toContain('Needs trained proficiency in thievery.');
      expect(rowText(fixture, 'Stride')).toContain('Available');
    });

    it('filters by mode', async () => {
      const fixture = await render(STANDING_ACTIONS, { view: ActionsViewKind.All });

      press(fixture, 'Downtime');
      await fixture.whenStable();

      expect(namesOf(fixture)).toStrictEqual(['Earn Income']);
    });

    it('filters by trait, cost and source, all of them together', async () => {
      const fixture = await render(STANDING_ACTIONS, { view: ActionsViewKind.All });

      press(fixture, 'attack');
      press(fixture, '1 action');
      press(fixture, 'Skill action');
      await fixture.whenStable();

      expect(namesOf(fixture)).toStrictEqual(['Escape', 'Grapple']);
    });

    it('says so when the filters leave nothing', async () => {
      const fixture = await render(STANDING_ACTIONS, { view: ActionsViewKind.All });

      press(fixture, 'Reaction');
      press(fixture, 'Basic action');
      await fixture.whenStable();

      expect(textOf(hostOf(fixture))).toContain('No action matches the filters.');
    });
  });

  describe('rolling', () => {
    it('rolls an action that rolls with one click, by its name and best skill', async () => {
      const rolled: RollableStatistic[] = [];
      const fixture = await render(STANDING_ACTIONS, {
        roller: {
          roll: (check): void => {
            rolled.push(check);
          },
        },
      });

      hostOf(fixture).querySelector<HTMLButtonElement>('button[aria-label^="Roll "]')?.click();

      expect(rolled.map(({ name }) => name)).toStrictEqual(['Escape']);
    });

    it('offers no roll button without a roller', async () => {
      const fixture = await render(STANDING_ACTIONS);

      expect(hostOf(fixture).querySelectorAll('button[aria-label^="Roll "]')).toHaveLength(0);
    });
  });
});
