import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, playOf, present } from '../../testing/sheet-page-harness';
import { render, textOf } from '../../testing/sheet-tabs-testing';

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

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...hitPointsOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

function typeAmount(root: HTMLElement, amount: number): void {
  const input = present(hitPointsOf(root).querySelector<HTMLInputElement>('input[aria-label="Amount"]'));
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
    });
  });

  it('says Hit Points wait for a class while there is no maximum', async () => {
    const { root } = await openSheet(MERISIEL);

    await vi.waitFor(() => {
      expect(textOf(hitPointsOf(root))).toBe('Hit Points show once the character has an ancestry and a class.');
    });
  });

  it('sends damage of the amount typed at the revision read, and shows the answer', async () => {
    const { root } = await openSheet(CLERIC_MERISIEL, { play: playOf(0, 0) });
    await vi.waitFor(() => {
      expect(meterOf(root).value).toBe(MAX_HP);
    });

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

    typeAmount(root, 4);
    buttonOf(root, 'Heal').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'heal', amount: 4 } });
      request.flush(playOf(2, 0, 2));
    });
  });
});
