import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
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
