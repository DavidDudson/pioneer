import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

/** The play state of a full-health character with `turn`, at `revision`. */
function playWith(turn: object, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, turn } };
}

function barOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-turn-bar'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...barOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

/** Enters the encounter: sends the command and answers with the character off-turn. */
async function enterEncounter(root: HTMLElement): Promise<void> {
  await vi.waitFor(() => {
    expect(textOf(barOf(root))).toContain('Out of encounter');
  });
  buttonOf(root, 'Enter encounter').click();
  await vi.waitFor(() => {
    const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
    expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'enterEncounter' } });
    request.flush({ ...playWith({ phase: 'off-turn', actions: 0 }, 2), events: [] });
  });
}

describe('CharacterSheetPage initiative', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('offers Enter encounter only out of an encounter', async () => {
    const outside = await openSheet(MERISIEL, { play: playWith({ phase: 'out-of-encounter' }) });
    await vi.waitFor(() => {
      expect(textOf(barOf(outside.root))).toContain('Out of encounter');
    });
    expect(buttonOf(outside.root, 'Enter encounter').disabled).toBe(false);
  });

  it('enters the encounter and offers the initiative roll, starting on Perception', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith({ phase: 'out-of-encounter' }) });

    await enterEncounter(root);

    await vi.waitFor(() => {
      const picker = present(root.querySelector<HTMLElement>('pio-sheet-initiative'));
      expect(textOf(picker)).toContain('Roll initiative');
      expect(textOf(picker)).toMatch(/Perception [+-]\d+/u);
    });
    expect(textOf(barOf(root))).toContain('Off-turn');
  });

  it('rolls initiative to the last roll and rolls it again, sending nothing about it to the server', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith({ phase: 'out-of-encounter' }) });
    await enterEncounter(root);
    const picker = await vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-initiative')));

    present([...picker.querySelectorAll('button')].find((button) => textOf(button) === 'Roll initiative')).click();

    await vi.waitFor(() => {
      const lastRoll = present(root.querySelector<HTMLElement>('pio-sheet-last-roll'));
      expect(textOf(lastRoll)).toContain('Perception');
      expect(textOf(picker)).toContain('Roll again');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('skips the roll and stays in the encounter', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith({ phase: 'out-of-encounter' }) });
    await enterEncounter(root);
    const picker = await vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-initiative')));

    present([...picker.querySelectorAll('button')].find((button) => textOf(button) === 'Skip')).click();

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-initiative')).toBeNull();
    });
    expect(textOf(barOf(root))).toContain('Off-turn');
  });
});
