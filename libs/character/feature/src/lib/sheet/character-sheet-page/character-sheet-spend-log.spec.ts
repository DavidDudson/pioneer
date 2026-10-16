import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;
const SPEND = '00000000-0000-4000-8000-000000000001';
const ACTION = '00000000-0000-4000-8000-0000000000aa';
const TURN = { phase: 'turn', actions: 1, quickened: 0, reactionUsed: false };

/** The play state of a full-health character in a turn with `spendLog`, at `revision`. */
function playWith(spendLog: readonly object[], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, turn: TURN, spendLog } };
}

function logOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-spend-log'));
}

const spent = {
  id: SPEND,
  action: ACTION,
  cost: { kind: 'actions', count: 2 },
  at: '2026-10-16T12:00:00.000Z',
  quickened: 0,
};

describe('CharacterSheetPage spend log', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('lists what was used this turn with its cost', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith([spent]) });

    await vi.waitFor(() => {
      expect(textOf(logOf(root))).toContain('Used this turn');
    });
    expect(textOf(logOf(root))).toContain('2 actions');
  });

  it('shows nothing when nothing was used', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith([]) });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-turn-bar')).not.toBeNull();
    });
    expect(textOf(logOf(root))).toBe('');
  });

  it('sends undoSpend for the spend and drops it from the log', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith([spent]) });
    await vi.waitFor(() => {
      expect(textOf(logOf(root))).toContain('Used this turn');
    });

    present([...logOf(root).querySelectorAll('button')].find((button) => textOf(button) === 'Undo')).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'undoSpend', id: SPEND },
      });
      request.flush({ ...playWith([], 2), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(logOf(root))).not.toContain('Used this turn');
    });
  });
});
