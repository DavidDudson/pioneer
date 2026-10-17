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

const POTIONS = '88888888-8888-4888-8888-888888888888';
/** The sheet derives again after each edit, which takes longer than the default wait. */
const SETTLE = 8000;
const HEALING_DIE = 8;
const LEVEL_BONUS = 11;

/** A character holding a stack of two healing potions. */
const HOLDING = {
  ...MERISIEL,
  inventory: {
    items: [{ id: POTIONS, item: itemFixtureId(ItemFixture.HealingPotion), quantity: 2, carry: { state: 'stowed' } }],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

const TONIC = '99999999-9999-4999-8999-999999999999';
const UNREADABLE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

/** A character holding a potion of the given fixture. */
function holding(fixture: ItemFixture, stack: string): typeof HOLDING {
  return {
    ...HOLDING,
    inventory: {
      ...HOLDING.inventory,
      items: [{ id: stack, item: itemFixtureId(fixture), quantity: 2, carry: { state: 'stowed' } }],
    },
  };
}

/** The play state on a turn with `actions` left. */
function playWith(actions: number, revision = 1): object {
  return {
    revision,
    play: { hp: { damage: 10, temp: 0 }, turn: { phase: 'turn', actions, quickened: 0, reactionUsed: false } },
  };
}

async function consumablesOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => {
    const consumables = present(root.querySelector<HTMLElement>('pio-sheet-consumables'));
    expect(textOf(consumables)).toContain('×2');
    return consumables;
  });
}

function useOf(consumables: HTMLElement): HTMLButtonElement {
  return present([...consumables.querySelectorAll('button')].find((button) => textOf(button) === 'Use'));
}

describe('CharacterSheetPage consumables', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists a held stack with how many are left and what using it costs', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(3), packs: PACKS });

    expect(textOf(await consumablesOf(root))).toContain('(1 action)');
  });

  it('offers no use once the turn cannot pay for the activation', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(0), packs: PACKS });

    expect(useOf(await consumablesOf(root)).disabled).toBe(true);
  });

  it('uses one, restoring the Hit Points it rolled, and reads the character again', async () => {
    const { root } = await openSheet(HOLDING, { play: playWith(3), packs: PACKS });
    const consumables = await consumablesOf(root);

    useOf(consumables).click();

    await vi.waitFor(
      () => {
        const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
        expect(request.request.body).toMatchObject({
          expectedRevision: 1,
          command: { field: 'useConsumable', item: POTIONS, spend: { cost: { kind: 'actions', count: 1 } } },
        });
        const { command } = request.request.body as { command: { heal: number } };
        const healed = command.heal;
        expect(healed).toBeGreaterThanOrEqual(1);
        expect(healed).toBeLessThanOrEqual(HEALING_DIE);
        request.flush({ ...playWith(2, 2), events: [] });
      },
      { timeout: SETTLE },
    );
    await vi.waitFor(
      () => {
        TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: CHARACTER_URL });
      },
      { timeout: SETTLE },
    );
    expect(textOf(consumables)).toContain('1d8');
  });

  it("rolls a formula that reads the character with the character's values", async () => {
    const { root } = await openSheet(holding(ItemFixture.LevelTonic, TONIC), { play: playWith(3), packs: PACKS });
    const consumables = await consumablesOf(root);

    useOf(consumables).click();

    await vi.waitFor(
      () => {
        const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
        const { command } = request.request.body as { command: { heal: number } };
        expect(command.heal).toBeGreaterThanOrEqual(1 + LEVEL_BONUS);
        expect(command.heal).toBeLessThanOrEqual(HEALING_DIE + LEVEL_BONUS);
        request.flush({ ...playWith(2, 2), events: [] });
      },
      { timeout: SETTLE },
    );
  });

  it('shows an error instead of rolling a formula that cannot resolve', async () => {
    const { root } = await openSheet(holding(ItemFixture.UnreadableTonic, UNREADABLE), {
      play: playWith(3),
      packs: PACKS,
    });
    const consumables = await consumablesOf(root);

    expect(textOf(consumables)).toContain('@item.value');
    expect(useOf(consumables).disabled).toBe(true);
  });
});
