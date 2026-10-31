import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { classFeatSlotKey } from '../../testing/class-feat-slots';
import { pickRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

/** The actions, the feats that grant them and the effects a form is. */
const PACKS = cutTo(ACTION_CONTENT_KINDS);

/** Mwangi Expanse's Change Shape, whose forms the feats a character has allow. */
const CHANGE_SHAPE = 'e114f41a-9129-5b91-b7d2-f88e152b9c0c';

const WERECREATURE_DEDICATION = contentId(
  PackId.parse('howl-of-the-wild'),
  EntrySlug.parse('feat:werecreature-dedication'),
);

const OWN_TURN = { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false };

/** Player Core's fighter's 2nd-level class feat slot. */
const FIGHTER_FEAT_2 = await classFeatSlotKey('fighter', 2);

/** A 2nd-level fighter who took Werecreature Dedication as a class feat. */
const WEREFIGHTER = {
  ...MERISIEL,
  level: 2,
  build: {
    choices: {
      ...MERISIEL.build.choices,
      class: playerCoreClassId('fighter'),
      'boost:1:class:0': 'str',
      [FIGHTER_FEAT_2]: WERECREATURE_DEDICATION,
    },
  },
};

const PLAY = { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn: OWN_TURN, spendLog: [] } };

/** What a pick reaches: the harness holding the sheet and its root. */
type Opened = Pick<OpenSheet, 'harness' | 'root'>;

function pickerOf(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('pio-form-picker');
}

function buttonIn(root: HTMLElement, name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((button) => textOf(button) === name);
  return present(found);
}

/** Presses Use on the Change Shape row and waits for the form picker to open. */
async function openPicker(): Promise<Opened> {
  const { harness, root } = await openSheet(WEREFIGHTER, { packs: PACKS, play: PLAY });
  const use = await vi.waitFor(() => {
    const row = [...root.querySelectorAll('pio-action-row')].find((candidate) =>
      textOf(candidate).startsWith('Change Shape'),
    );
    return present([...present(row).querySelectorAll('button')].find((button) => textOf(button) === 'Use'));
  });
  use.click();
  await vi.waitFor(() => {
    expect(pickerOf(root)).not.toBeNull();
  });
  return { harness, root };
}

describe('CharacterSheetPage using Change Shape', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('opens the form picker and spends nothing until a form is confirmed', async () => {
    const { root } = await openPicker();

    expect(textOf(pickerOf(root))).toContain('Use Change Shape: choose a form');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('spends the action and puts the form on the character in one edit when a form is confirmed', async () => {
    const { harness, root } = await openPicker();
    pickRow(harness, present(pickerOf(root)), { matches: () => true });
    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('This form changes none of the numbers');
    });

    buttonIn(root, 'Use and transform').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      const { command } = request.request.body as { command: object };
      expect(command).toMatchObject({ field: 'spendAction', action: CHANGE_SHAPE });
      request.flush({ ...PLAY, events: [] });
    });
  });
});
