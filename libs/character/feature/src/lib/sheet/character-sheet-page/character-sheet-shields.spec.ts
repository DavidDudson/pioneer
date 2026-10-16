import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;
const CHARACTER_URL = `/api/characters/${id}`;
const PACKS = [...cutTo(ACTION_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const SHIELD = '77777777-7777-4777-8777-777777777777';
/** The Raise a Shield effect in Player Core. */
const RAISED_EFFECT = '6d28ce6a-b876-5711-b183-9f1528122d4b';
/** The sheet derives again after each edit, which takes longer than the default wait. */
const SETTLE = 8000;
const TURN = { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false };
const RAISED = [{ id: '00000000-0000-4000-8000-0000000000e1', effect: RAISED_EFFECT, source: { kind: 'self' } }];

/** A character holding a steel shield (Hardness 5, 20 Hit Points). */
const HOLDING = {
  ...MERISIEL,
  inventory: {
    items: [
      { id: SHIELD, item: itemFixtureId(ItemFixture.SteelShield), quantity: 1, carry: { state: 'held', hands: 1 } },
    ],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

/** The play state with the shield having taken `damage`, raised or not. */
function playWith(damage: number, effects: readonly object[] = [], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, turn: TURN, shields: { [SHIELD]: damage }, effects } };
}

async function shieldsOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const shields = present(root.querySelector<HTMLElement>('pio-sheet-shields'));
    expect(textOf(shields)).toContain('Hardness 5');
    return shields;
  });
}

function blockOf(shields: HTMLElement): HTMLButtonElement {
  return present([...shields.querySelectorAll('button')].find((button) => textOf(button) === 'Shield Block'));
}

describe('CharacterSheetPage shields', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists a held shield with the Hit Points it has left and its Hardness', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(6), packs: PACKS });

    expect(textOf(await shieldsOf(root))).toContain('14/20 HP, Hardness 5');
  });

  it('says a shield at its Broken Threshold is broken, and offers no block', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(10, RAISED), packs: PACKS });
    const shields = await shieldsOf(root);

    expect(textOf(shields)).toContain('broken');
    expect(blockOf(shields).disabled).toBe(true);
  });

  it('offers no block while the shield is not raised', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(0), packs: PACKS });

    expect(blockOf(await shieldsOf(root)).disabled).toBe(true);
  });

  it('spends the reaction, then blocks the damage with the shield, and reads the character again', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(0, RAISED), packs: PACKS });
    const shields = await shieldsOf(root);
    const amount = present(shields.querySelector<HTMLInputElement>('input'));
    amount.value = '9';
    amount.dispatchEvent(new Event('input'));
    await vi.waitFor(() => {
      expect(blockOf(shields).disabled).toBe(false);
    });

    blockOf(shields).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'spendAction', cost: { kind: 'reaction' } },
      });
      request.flush({ ...playWith(0, RAISED, 2), events: [] });
    });
    await vi.waitFor(
      () => {
        const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
        expect(request.request.body).toMatchObject({
          expectedRevision: 2,
          command: { field: 'blockWithShield', item: SHIELD },
        });
        request.flush({ ...playWith(4, RAISED, 3), events: [] });
      },
      { timeout: SETTLE },
    );
    await vi.waitFor(
      () => {
        TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: CHARACTER_URL });
      },
      { timeout: SETTLE },
    );
  });
});
