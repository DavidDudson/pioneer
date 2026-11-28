import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { describe, expect, it, vi } from 'vitest';

import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { fakeDialog, render, settle, textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

const FIGHTER = {
  ...MERISIEL,
  build: {
    choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' },
  },
};

/** The d20 faces the next rolls land on. */
function rolling(...faces: ReadonlyArray<number>): void {
  TestBed.configureTestingModule({
    providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }],
  });
}

function rollButton(root: HTMLElement, name: string): HTMLButtonElement {
  return present(root.querySelector<HTMLButtonElement>(`button[aria-label^="Roll ${name} "]`));
}

function entry(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-roll-history-button'));
}

function history(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-roll-history-drawer'));
}

async function rolled(root: HTMLElement, name: string): Promise<void> {
  const button = await vi.waitFor(() => rollButton(root, name));
  button.click();
  render();
  await vi.waitFor(() => {
    expect(textOf(entry(root))).toContain(name);
  });
}

describe('CharacterSheetPage roll history', () => {
  it('shows no entry in the header until a check is rolled', async () => {
    const { root } = await openSheet(FIGHTER);

    await vi.waitFor(() => {
      expect(root.querySelector('button[aria-label^="Roll Athletics"]')).not.toBeNull();
    });
    expect(textOf(entry(root))).toBe('');
  });

  it('names the last roll in the header, and shows its degree once a DC is typed', async () => {
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    await rolled(root, 'Athletics');
    expect(textOf(entry(root))).toMatch(/^Athletics: \d+$/u);

    const total = /: (?<total>\d+)/u.exec(textOf(entry(root)))?.groups?.['total'];
    const card = present(root.querySelector<HTMLElement>('pio-sheet-last-roll'));
    const input = present(card.querySelector<HTMLInputElement>('input'));
    input.value = String(total);
    input.dispatchEvent(new Event('input'));
    await settle();

    await vi.waitFor(() => {
      expect(textOf(entry(root))).toBe(`Athletics: ${total}, Success`);
    });
  });

  it('lists the rolls newest first, each with the breakdown it was made with', async () => {
    fakeDialog();
    rolling(12, 5);
    const { root } = await openSheet(FIGHTER);
    await rolled(root, 'Athletics');
    await rolled(root, 'Acrobatics');
    present(entry(root).querySelector('button')).click();
    render();

    await vi.waitFor(() => {
      const text = textOf(history(root));
      expect(text.indexOf('Acrobatics check')).toBeGreaterThanOrEqual(0);
      expect(text.indexOf('Acrobatics check')).toBeLessThan(text.indexOf('Athletics check'));
    });
    expect(history(root).querySelectorAll('pio-breakdown')).toHaveLength(2);
  });

  it('opens from the header entry', async () => {
    fakeDialog();
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    await rolled(root, 'Athletics');

    present(entry(root).querySelector('button')).click();
    render();

    await vi.waitFor(() => {
      expect(textOf(history(root))).toContain('Roll history');
    });
  });

  it('clears the history, and with it the header entry', async () => {
    fakeDialog();
    rolling(12);
    const { root } = await openSheet(FIGHTER);
    await rolled(root, 'Athletics');
    present(entry(root).querySelector('button')).click();
    render();

    const clear = await vi.waitFor(() =>
      present([...history(root).querySelectorAll('button')].find((button) => textOf(button) === 'Clear history')),
    );

    clear.click();
    render();

    await vi.waitFor(() => {
      expect(textOf(history(root))).toContain('No rolls yet');
    });
    expect(textOf(entry(root))).toBe('');
  });
});
