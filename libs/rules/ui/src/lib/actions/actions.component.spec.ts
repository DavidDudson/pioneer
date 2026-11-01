import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ActionMode } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it } from 'vitest';

import { STATISTIC_ROLLER } from '../statistics/statistic-roller';
import type { RollableStatistic, StatisticRoller } from '../statistics/statistic-roller';
import { GRABBED_ACTIONS, PRONE_ACTIONS, SHIELD_RAISED_ACTIONS, STANDING_ACTIONS } from '../testing/action-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { ActionLine } from './action-line';
import { ActionUser } from './action-user';
import type { ActionUse } from './action-user';
import { ActionsViewKind } from './actions-list';
import { ActionsView } from './actions.component';

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

interface Options {
  readonly mode?: ActionMode;
  readonly view?: ActionsViewKind;
  readonly roller?: StatisticRoller;
  readonly user?: ActionUser;
}

async function render(
  lines: readonly ActionLine[] | undefined,
  { mode = ActionMode.Encounter, view = ActionsViewKind.Now, roller, user }: Options = {},
): Promise<ComponentFixture<ActionsView>> {
  TestBed.configureTestingModule({
    providers: [
      provideRulesUiI18nTesting(),
      provideTanStackQuery(new QueryClient()),
      ...(roller === undefined ? [] : [{ provide: STATISTIC_ROLLER, useValue: roller }]),
      ...(user === undefined ? [] : [{ provide: ActionUser, useValue: user }]),
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
    textOf(candidate).includes(name),
  );
  return row === undefined ? '' : textOf(row);
}

function press(fixture: ComponentFixture<ActionsView>, label: string): void {
  const button = [...hostOf(fixture).querySelectorAll('button')].find((candidate) => textOf(candidate) === label);
  button?.click();
}

describe(ActionsView, () => {
  describe('the Now view', () => {
    it('lists the usable actions of the mode grouped by cost, by name in each group, leaving out those that cannot be used', async () => {
      const fixture = await render(STANDING_ACTIONS);

      expect(headingsOf(fixture)).toStrictEqual(['1 action', '2 actions']);
      expect(namesOf(fixture)).toStrictEqual([
        'Demoralize',
        'Escape',
        'Grapple',
        'Stand',
        'Stride',
        'Disable a Device',
      ]);
    });

    it('leaves the unusable and dormant ones out', async () => {
      const fixture = await render(STANDING_ACTIONS);
      const text = textOf(hostOf(fixture));

      expect(text).not.toContain('Pick a Lock');
      expect(text).not.toContain('Shield Block');
    });

    it('sorts by name when prone, not by what the situation calls for', async () => {
      const fixture = await render(PRONE_ACTIONS);

      expect(namesOf(fixture)).toStrictEqual(['Crawl', 'Demoralize', 'Stand', 'Stride']);
    });

    it('sorts by name when grabbed', async () => {
      const fixture = await render(GRABBED_ACTIONS);

      expect(namesOf(fixture)).toStrictEqual(['Demoralize', 'Escape', 'Stride']);
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
    it('lists every action with its status', async () => {
      const fixture = await render(STANDING_ACTIONS, { view: ActionsViewKind.All });

      expect(namesOf(fixture)).toHaveLength(STANDING_ACTIONS.length);
      expect(rowText(fixture, 'Pick a Lock')).toContain('Unavailable');
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

/** An action user that remembers what it was asked to use. */
interface Recorder {
  readonly user: ActionUser;
  readonly used: ActionUse[];
}

function recorder(): Recorder {
  const used: ActionUse[] = [];
  return {
    used,
    user: {
      use: async (request): Promise<void> => {
        used.push(request);
        await Promise.resolve();
      },
    },
  };
}

function buttonsOf(fixture: ComponentFixture<ActionsView>): HTMLButtonElement[] {
  return [...hostOf(fixture).querySelectorAll('pio-action-row button')].filter(
    (button): button is HTMLButtonElement => button instanceof HTMLButtonElement,
  );
}

/** `line` as an action that can be used for one action or two. */
function upToTwo(line: ActionLine): ActionLine {
  return { ...line, upTo: 2 };
}

describe('using an action', () => {
  const variable = STANDING_ACTIONS.slice(0, 1).map((line) => upToTwo(line));

  it('shows no Use button when the page spends nothing', async () => {
    const fixture = await render(STANDING_ACTIONS);
    expect(buttonsOf(fixture).filter((button) => textOf(button) === 'Use')).toHaveLength(0);
  });

  it('uses the action when its Use button is clicked', async () => {
    const { user, used } = recorder();
    const fixture = await render(STANDING_ACTIONS, { user });
    const use = buttonsOf(fixture).find((button) => textOf(button) === 'Use');
    use?.click();
    await fixture.whenStable();
    expect(used).toHaveLength(1);
    expect(used[0]?.actions).toBeUndefined();
  });

  it('offers each count a variable cost can be used for', async () => {
    const { user, used } = recorder();
    const fixture = await render(variable, { user });
    expect(buttonsOf(fixture).map((button) => textOf(button))).toStrictEqual(['Use for 1 action', 'Use for 2 actions']);
    buttonsOf(fixture)[1]?.click();
    await fixture.whenStable();
    expect(used[0]?.actions).toBe(2);
  });
});

function rowTexts(fixture: ComponentFixture<ActionsView>): string[] {
  return [...hostOf(fixture).querySelectorAll('pio-action-row')].map((row) => textOf(row));
}

/** The first of the standing actions, which the tests below make dear or cheap. */
function firstStanding(): ActionLine {
  const [first] = STANDING_ACTIONS;
  if (first === undefined) {
    throw new Error('The standing actions are empty');
  }
  return first;
}

const FIRST_STANDING = firstStanding();

describe('what the turn has the actions for', () => {
  it('leaves out of the Now view an action the turn cannot pay', async () => {
    const lines = [{ ...FIRST_STANDING, affordable: false }, ...STANDING_ACTIONS.slice(1)];
    const fixture = await render(lines);
    expect(rowTexts(fixture).some((row) => row.includes(FIRST_STANDING.name))).toBe(false);
    expect(rowTexts(fixture).length).toBeGreaterThan(0);
  });

  it('still lists it in the All view, without a Use button', async () => {
    const { user } = recorder();
    const lines = STANDING_ACTIONS.map((line): ActionLine => ({ ...line, affordable: false }));
    const fixture = await render(lines, { user, view: ActionsViewKind.All });
    expect(rowTexts(fixture)).toHaveLength(STANDING_ACTIONS.length);
    expect(buttonsOf(fixture).filter((button) => textOf(button).startsWith('Use'))).toHaveLength(0);
  });

  it('offers only the counts of a variable cost the turn can pay', async () => {
    const { user } = recorder();
    const line = { ...upToTwo(FIRST_STANDING), affordableUpTo: 1 };
    const fixture = await render([line], { user });
    expect(buttonsOf(fixture).map((button) => textOf(button))).toStrictEqual(['Use for 1 action']);
  });
});
