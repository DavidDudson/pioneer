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

describe('CharacterSheetPage turn bar', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([]);
  }, PREBUILD_TIMEOUT);

  it('starts out of the encounter, where only Start turn does anything', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith({ phase: 'out-of-encounter' }) });

    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('Out of encounter');
    });
    expect(buttonOf(root, 'Start turn').disabled).toBe(false);
    expect(buttonOf(root, 'End turn').disabled).toBe(true);
    expect(buttonOf(root, 'Leave encounter').disabled).toBe(true);
  });

  it('shows the actions spent and left, the quickened action apart, and the spent reaction', async () => {
    const turn = { phase: 'turn', actions: 1, quickened: 1, quickenedFor: 'Strike or Stride only', reactionUsed: true };
    const { root } = await openSheet(MERISIEL, { play: playWith(turn) });

    await vi.waitFor(() => {
      const text = textOf(barOf(root));
      expect(text).toContain('Your turn');
      expect(text).toContain('Quickened action: Strike or Stride only');
      expect(text).toContain('Reaction spent');
    });
    expect(textOf(barOf(root)).match(/Spent/gu)).toHaveLength(2);
    expect(buttonOf(root, 'Start turn').disabled).toBe(true);
    expect(buttonOf(root, 'End turn').disabled).toBe(false);
  });

  it('sends Start turn and shows what the start of the turn did', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith({ phase: 'off-turn' }) });
    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('Off-turn');
    });

    buttonOf(root, 'Start turn').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'startTurn' } });
      request.flush({
        ...playWith({ phase: 'turn', actions: 3, quickened: 0, reactionUsed: false }, 2),
        events: [
          { kind: 'turnStart', message: { key: 'character.turn.started' } },
          {
            kind: 'healed',
            type: 'fast-healing',
            gained: 5,
            message: { key: 'character.turn.fastHealing', params: { amount: 5 } },
          },
        ],
      });
    });
    await vi.waitFor(() => {
      const text = textOf(barOf(root));
      expect(text).toContain('Your turn begins.');
      expect(text).toContain('Fast healing restores 5 Hit Points.');
      expect(text).toContain('Reaction ready');
    });
  });

  it('sends End turn from a running turn and goes off-turn', async () => {
    const turn = { phase: 'turn', actions: 2, quickened: 0, reactionUsed: false };
    const { root } = await openSheet(MERISIEL, { play: playWith(turn) });
    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('Your turn');
    });

    buttonOf(root, 'End turn').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'endTurn' } });
      request.flush({ ...playWith({ phase: 'off-turn', actions: 0 }, 2), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('Off-turn');
    });
  });
});
