import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

/** Merisiel as a cleric of Irori, whose favoured weapon is the fist: a character with a Strike. */
const IRORI = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:irori'));
const CLERIC = {
  ...MERISIEL,
  build: {
    choices: {
      ...MERISIEL.build.choices,
      class: playerCoreClassId('cleric'),
      'boost:1:class:0': 'wis',
      deity: IRORI,
    },
  },
};

/** The play state of a full-health character with `phase` and `attacks` made, at `revision`. */
function playWith(phase: string, attacks: number, revision = 1): object {
  const turn = { phase, actions: 1, quickened: 0, reactionUsed: false, attacks };
  return { revision, play: { hp: { damage: 0, temp: 0 }, turn, spendLog: [] } };
}

function barOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-turn-bar'));
}

describe('CharacterSheetPage attacks made', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('counts the attacks made on a running turn, and marks the next one on each Strike', async () => {
    const { root } = await openSheet(CLERIC, { play: playWith('turn', 2) });

    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('2 attacks made');
    });
    // A finesse fist: +5, and the third attack of a turn takes -8.
    await vi.waitFor(() => {
      expect(textOf(root)).toContain('Next attack: -3');
    });
  });

  it('counts none outside a turn', async () => {
    const { root } = await openSheet(CLERIC, { play: playWith('off-turn', 0) });

    await vi.waitFor(() => {
      expect(textOf(root)).toContain('Fist +5');
    });
    expect(textOf(barOf(root))).not.toContain('attacks made');
    expect(textOf(root)).not.toContain('Next attack:');
  });

  it('sends setAttacks with one more when More attacks is pressed', async () => {
    const { root } = await openSheet(MERISIEL, { play: playWith('turn', 1) });
    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('1 attack made');
    });

    present([...barOf(root).querySelectorAll('button')].find((button) => textOf(button) === 'More attacks')).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'setAttacks', count: 2 },
      });
      request.flush({ ...playWith('turn', 2, 2), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(barOf(root))).toContain('2 attacks made');
    });
  });
});
