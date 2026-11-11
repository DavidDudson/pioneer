import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { openActionKind, textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';

const PLAY_URL = `/api/characters/${id}/play`;
const PACKS = [...cutTo(ACTION_CONTENT_KINDS), ITEM_FIXTURE_FILES];
const POTIONS = '88888888-8888-4888-8888-888888888888';
/** The sheet derives again after each edit, which takes longer than the default wait. */
const SETTLE = 8000;

/** A character holding a stack of two healing potions. */
const HOLDING = {
  ...MERISIEL,
  inventory: {
    items: [{ id: POTIONS, item: itemFixtureId(ItemFixture.HealingPotion), quantity: 2, carry: { state: 'stowed' } }],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

const PLAY = {
  revision: 1,
  play: { hp: { damage: 10, temp: 0 }, turn: { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false } },
};

function actionsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-actions"]'));
}

describe('CharacterSheetPage actions: a healing item', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows the dice it rolled on the roll card, as the Consumables section does', async () => {
    const { root } = await openSheet(HOLDING, {
      tab: SheetMode.Encounter,
      section: 'actions',
      play: PLAY,
      packs: PACKS,
    });
    await openActionKind(root, 'Items');
    const useButton = await vi.waitFor(() => {
      const row = present(
        [...actionsSection(root).querySelectorAll('pio-action-row')].find((candidate) =>
          textOf(candidate).includes('Healing-potion'),
        ),
      );
      return present([...row.querySelectorAll('button')].find((button) => textOf(button) === 'Use'));
    });

    useButton.click();

    await vi.waitFor(
      () => {
        const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
        expect(request.request.body).toMatchObject({ command: { field: 'useConsumable', item: POTIONS } });
        request.flush({ ...PLAY, revision: 2, events: [] });
      },
      { timeout: SETTLE },
    );
    await vi.waitFor(
      () => {
        const card = present(actionsSection(root).querySelector('pio-roll-card'));
        expect(textOf(card)).toContain('1d8');
      },
      { timeout: SETTLE },
    );
  });
});
