import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const BLADE = '99999999-9999-4999-8999-999999999999';
const PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];

/** Merisiel holding a sword whose rule elements add 1d6 fire precision damage and a note on a critical success. */
const EMBER_SWORDSWOMAN = {
  ...MERISIEL,
  inventory: {
    items: [
      {
        id: BLADE,
        item: itemFixtureId(ItemFixture.EmberBlade),
        quantity: 1,
        carry: { state: 'held', hands: 1 },
      },
    ],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

describe('CharacterSheetPage Strike rule elements', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists the dice and the note a held weapon’s rule elements give its Strike', async () => {
    const { root } = await openSheet(EMBER_SWORDSWOMAN, { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      const strikes = textOf(root);
      expect(strikes).toContain('Plus 1d6 fire precision');
      expect(strikes).toContain('Embers');
      expect(strikes).toContain('On a critical success');
      expect(strikes).toContain('The target catches fire.');
    });
  });
});
