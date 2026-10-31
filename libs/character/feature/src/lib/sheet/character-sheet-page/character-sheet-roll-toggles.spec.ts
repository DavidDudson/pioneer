import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { render, textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];
const CLOAK = '66666666-6666-4666-8666-666666666666';
const openAtEncounter = openerAt(SheetMode.Encounter);

async function openSheet(character: object): Promise<OpenSheet> {
  return openAtEncounter(character, { packs: PACKS });
}

/** Merisiel wearing an invested Hunter's cloak: +1 against undead, and a focus toggle worth +2 while it is on. */
const HUNTER = {
  ...MERISIEL,
  inventory: {
    items: [
      {
        id: CLOAK,
        item: itemFixtureId(ItemFixture.HuntersCloak),
        quantity: 1,
        carry: { state: 'worn' },
        invested: true,
      },
    ],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

function rolling(...faces: readonly number[]): void {
  TestBed.configureTestingModule({
    providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }],
  });
}

function lastRoll(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-last-roll'));
}

async function pressPerception(root: HTMLElement): Promise<void> {
  const button = await vi.waitFor(() =>
    present(root.querySelector<HTMLButtonElement>('button[aria-label="Roll Perception"]')),
  );
  button.click();
  render();
}

/** The toggle on the sheet that claims the undead situation for the next Perception roll. */
async function undeadToggle(root: HTMLElement): Promise<HTMLButtonElement> {
  return vi.waitFor(() =>
    present(
      [...root.querySelectorAll<HTMLButtonElement>('pio-statistic-conditions button')].find((button) =>
        textOf(button).includes('when the target is undead'),
      ),
    ),
  );
}

/** Perception's total as the vitals list it, "+4" giving 4; throws until it is listed. */
function perceptionTotal(root: HTMLElement): number {
  const row = present(root.querySelector('button[aria-label="Roll Perception"]')?.closest('fr-list-item'));
  const total = present(row.querySelector('pio-statistic-total'));
  const match = /(?<sign>[+−-])(?<value>\d+)/u.exec(textOf(total));
  const value = Number(match?.groups?.['value']);
  return match?.groups?.['sign'] === '+' ? value : -value;
}

describe('CharacterSheetPage conditional toggles when rolling', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('rolls a check with nothing to toggle at once', async () => {
    rolling(10);
    const { root } = await openSheet(MERISIEL);

    const button = await vi.waitFor(() =>
      present(root.querySelector<HTMLButtonElement>('button[aria-label="Roll Perception"]')),
    );
    button.click();
    render();

    await vi.waitFor(() => {
      expect(textOf(lastRoll(root))).toContain('Perception check');
    });
    expect(root.querySelector('pio-sheet-roll-setup pio-roll-toggles')).toBeNull();
  });

  it('offers the situation as a toggle on the sheet, and the total follows it', async () => {
    const { root } = await openSheet(HUNTER);
    const toggle = await undeadToggle(root);
    const before = await vi.waitFor(() => perceptionTotal(root));

    toggle.click();
    render();

    await vi.waitFor(() => {
      expect(perceptionTotal(root)).toBe(before + 1);
    });
    const claimed = await undeadToggle(root);
    claimed.click();
    render();
    await vi.waitFor(() => {
      expect(perceptionTotal(root)).toBe(before);
    });
  });

  it('rolls at once with a situation claimed on the sheet, says so on the card, and lets the claim go', async () => {
    rolling(12);
    const { root } = await openSheet(HUNTER);
    const before = await vi.waitFor(() => perceptionTotal(root));
    const claimed = await undeadToggle(root);
    claimed.click();
    render();
    await vi.waitFor(() => {
      expect(perceptionTotal(root)).toBe(before + 1);
    });

    await pressPerception(root);

    await vi.waitFor(() => {
      const text = textOf(lastRoll(root));
      expect(text).toContain(`Total ${12 + before + 1}`);
      expect(text).toContain('when the target is undead');
    });
    expect(root.querySelector('pio-sheet-roll-setup pio-roll-toggles')).toBeNull();
    await vi.waitFor(() => {
      expect(perceptionTotal(root)).toBe(before);
    });
  });
});
