import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its feats and class features, for the slots a bard's class table gives. */
const PACKS = cutTo(FEAT_CONTENT_KINDS);

const BARD = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('bard') }, spellAccess: [] },
};

/** The play state of a full-health character with `slots` spent, by the key of the slots they came from. */
function spentOf(slots: object, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, resources: { slots } } };
}

function countedOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-counted'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...countedOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage spell slots', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("shows a bard's slots per rank, less what is spent", async () => {
    const { root } = await openSheet(BARD, { play: spentOf({}), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(countedOf(root))).toMatch(/rank 1 slots\s*2 of 2/u);
    });
  });

  it('spends a slot at the revision last read, and shows what the server answers', async () => {
    const { root } = await openSheet(BARD, { play: spentOf({}), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(countedOf(root))).toContain('2 of 2');
    });
    expect(buttonOf(root, 'Refund').disabled).toBe(true);

    buttonOf(root, 'Spend').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ expectedRevision: 1, command: { field: 'spendSlot' } });
      const { slot } = (request.request.body as { command: { slot: string } }).command;
      request.flush(spentOf({ [slot]: 1 }, 2));
    });
    await vi.waitFor(() => {
      expect(textOf(countedOf(root))).toContain('1 of 2');
    });
  });
});

const BOOTS = '66666666-6666-4666-8666-666666666666';

/** Merisiel wearing the winged boots, whose activation costs two actions and comes back each hour. */
const WEARING_BOOTS = {
  ...MERISIEL,
  inventory: {
    items: [{ id: BOOTS, item: itemFixtureId(ItemFixture.WingedBoots), quantity: 1, carry: { state: 'worn' } }],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

const BOOTS_PACKS = [...PACKS, ITEM_FIXTURE_FILES];

/** The play state of a character in its own turn with `actions` left. */
function turnWith(actions: number): object {
  const turn = { phase: 'turn', actions, quickened: 0, reactionUsed: false };
  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn } };
}

describe('CharacterSheetPage item activations', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], BOOTS_PACKS);
  }, PREBUILD_TIMEOUT);

  it('activates the item as a spend that takes its actions and records its use', async () => {
    const { root } = await openSheet(WEARING_BOOTS, { play: turnWith(3), packs: BOOTS_PACKS });
    await vi.waitFor(() => {
      expect(textOf(countedOf(root))).toContain('Take to the Skies');
    });

    buttonOf(root, 'Use').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: {
          field: 'spendAction',
          action: itemFixtureId(ItemFixture.WingedBoots),
          cost: { kind: 'actions', count: 2 },
          use: expect.stringContaining(BOOTS) as string,
        },
      });
      request.flush({ ...turnWith(1), events: [] });
    });
  });

  it('offers no activation the turn has too few actions for', async () => {
    const { root } = await openSheet(WEARING_BOOTS, { play: turnWith(1), packs: BOOTS_PACKS });
    await vi.waitFor(() => {
      expect(textOf(countedOf(root))).toContain('Take to the Skies');
    });
    expect([...countedOf(root).querySelectorAll('pio-use-buttons button')]).toHaveLength(0);
  });
});
