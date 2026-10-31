import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE, RollPresenter } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { describe, expect, it, vi } from 'vitest';

import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { render, settle, textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

const FIGHTER = {
  ...MERISIEL,
  build: {
    choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' },
  },
};

/** The d20 faces the next rolls land on. */
function rolling(...faces: readonly number[]): void {
  TestBed.configureTestingModule({
    providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }],
  });
}

function rollButton(root: HTMLElement, name: string): HTMLButtonElement {
  return present(root.querySelector<HTMLButtonElement>(`button[aria-label="Roll ${name}"]`));
}

function lastRoll(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-last-roll'));
}

/** The modifier shown beside `name` in the skills list: "Athletics +5" gives 5. */
function modifierOf(root: HTMLElement, name: string): number {
  const row = [...root.querySelectorAll('pio-statistics fr-list-item')]
    .map((item) => textOf(item))
    .find((text) => text.startsWith(name));
  const match = /(?<sign>[+-−])(?<value>\d+)/u.exec(row ?? '');
  if (match === null) {
    throw new Error(`Expected a modifier beside ${name}`);
  }
  const value = Number(match.groups?.['value']);
  return match.groups?.['sign'] === '+' ? value : -value;
}

describe('CharacterSheetPage rolls', () => {
  it('shows no roll until a check is rolled', async () => {
    const { root } = await openSheet(FIGHTER);

    await vi.waitFor(() => {
      expect(root.querySelector('button[aria-label="Roll Athletics"]')).not.toBeNull();
    });
    expect(lastRoll(root).querySelector('pio-roll-card')).toBeNull();
  });

  it('rolls a skill: one d20 plus its modifier, on a roll card with the breakdown it was rolled with', async () => {
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    const button = await vi.waitFor(() => rollButton(root, 'Athletics'));
    // The skills list renders once the engine has run, which can trail the sheet's first paint.
    const modifier = await vi.waitFor(() => modifierOf(root, 'Athletics'));

    button.click();
    render();

    await vi.waitFor(() => {
      const text = textOf(lastRoll(root));
      expect(text).toContain('Athletics check');
      expect(text).toContain(`Total ${12 + modifier}`);
      expect(text).toContain('Breakdown');
    });
    expect(lastRoll(root).querySelector('pio-breakdown')).not.toBeNull();
  });

  it('hands the engine roll to the roll stage: the dice land on the d20 it rolled, and the total is the same', async () => {
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    const button = await vi.waitFor(() => rollButton(root, 'Athletics'));
    const modifier = await vi.waitFor(() => modifierOf(root, 'Athletics'));

    button.click();
    render();

    const presenter = TestBed.inject(RollPresenter);
    await vi.waitFor(() => {
      expect(presenter.throwing()?.label).toBe('Athletics');
    });
    expect(presenter.throwing()?.groups.map(({ notation }) => notation)).toStrictEqual(['1d20@12']);
    expect(presenter.throwing()?.total).toBe(12 + modifier);
  });

  it('shows no degree until a DC is typed, then the degree against it', async () => {
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    // The skills list renders once the engine has run, which can trail the sheet's first paint.
    const modifier = await vi.waitFor(() => modifierOf(root, 'Athletics'));
    const button = await vi.waitFor(() => rollButton(root, 'Athletics'));
    button.click();
    render();
    await vi.waitFor(() => {
      expect(textOf(lastRoll(root))).toContain('Athletics check');
    });
    expect(lastRoll(root).querySelector('pio-roll-degree')).toBeNull();

    const input = present(lastRoll(root).querySelector<HTMLInputElement>('input'));
    input.value = String(12 + modifier);
    input.dispatchEvent(new Event('input'));
    await settle();

    await vi.waitFor(() => {
      const degree = present(lastRoll(root).querySelector('pio-roll-degree'));
      expect(textOf(degree)).toContain('Success');
    });
  });
});
