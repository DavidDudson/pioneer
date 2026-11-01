import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, playOf, present } from '../../testing/sheet-page-harness';
import { fakeDialog, render, textOf } from '../../testing/sheet-tabs-testing';

const PLAY_URL = `/api/characters/${id}/play`;

/** Merisiel as a cleric: an elf's 6 Hit Points, a cleric's 8 and her Constitution modifier of +1, at level 1. */
const CLERIC_MERISIEL = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric') } },
};
const MAX_HP = 15;

function hitPointsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-hit-points'));
}

function meterOf(root: HTMLElement): HTMLMeterElement {
  return present(hitPointsOf(root).querySelector('meter'));
}

/** The controls, in the drawer the block opens. */
function controlsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-hit-point-controls'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...controlsOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

/** Presses the block, which opens the controls. */
async function openControls(root: HTMLElement): Promise<void> {
  fakeDialog();
  present(hitPointsOf(root).querySelector('button')).click();
  await vi.waitFor(() => {
    expect(controlsOf(root).querySelector('input[aria-label="Amount"]')).not.toBeNull();
  });
}

function typeAmount(root: HTMLElement, amount: number): void {
  const input = present(controlsOf(root).querySelector<HTMLInputElement>('input[aria-label="Amount"]'));
  input.value = String(amount);
  input.dispatchEvent(new Event('input'));
  render();
}

describe('CharacterSheetPage Hit Points', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('shows current Hit Points against the maximum the engine derives, and temporary Hit Points', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(3, 2) });

    await vi.waitFor(() => {
      const meter = meterOf(root);
      expect([meter.value, meter.max]).toStrictEqual([MAX_HP - 3, MAX_HP]);
      expect(textOf(hitPointsOf(root))).toContain('+2 temporary');
      expect(textOf(hitPointsOf(root))).toContain(`${MAX_HP - 3}/${MAX_HP}`);
    });
  });

  it('has no number input in the block, and opens the controls when it is pressed', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP);
    });
    expect(hitPointsOf(root).querySelector('input')).toBeNull();

    await openControls(root);

    expect(hitPointsOf(root).querySelector('input')).toBeNull();
  });

  it.each([
    [8, ['Bloodied']],
    [12, ['Near death']],
    [0, []],
  ])('words how hurt the character is: %s damage taken reads %j', async (taken, words) => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(taken, 0) });

    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP - taken);
    });
    const shown = ['Bloodied', 'Near death', 'Down'].filter((each) => textOf(hitPointsOf(root)).includes(each));
    expect(shown).toStrictEqual(words);
  });

  it('sends damage of the amount typed at the revision read, and shows the answer', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP);
    });

    await openControls(root);
    typeAmount(root, 5);
    buttonOf(root, 'Damage').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'damage', damage: { taken: 5 } },
      });
      request.flush(playOf(5, 0, 2));
    });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP - 5);
    });
  });

  it('heals by the amount typed', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(6, 0) });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP - 6);
    });

    await openControls(root);
    typeAmount(root, 4);
    buttonOf(root, 'Heal').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'heal', amount: 4 } });
      request.flush(playOf(2, 0, 2));
    });
  });

  it('sets temporary Hit Points to the amount typed', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP);
    });

    await openControls(root);
    typeAmount(root, 5);
    buttonOf(root, 'Set temp HP').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'setTempHp', temp: 5 } });
      request.flush(playOf(0, 5, 2));
    });
  });
});
