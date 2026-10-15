import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const CHARM = '77777777-7777-4777-8777-777777777777';
const SHIELD = '66666666-6666-4666-8666-666666666666';
const SWORD = '55555555-5555-4555-8555-555555555555';
const PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];

function carried(id: string, fixture: ItemFixture, carry: object): object {
  return { id, item: itemFixtureId(fixture), quantity: 1, carry };
}

/** Merisiel holding a longsword and a steel shield, and wearing a charm whose alterations change them both. */
function wearingCharm(invested: boolean): object {
  return {
    ...MERISIEL,
    inventory: {
      items: [
        carried(SWORD, ItemFixture.Longsword, { state: 'held', hands: 1 }),
        carried(SHIELD, ItemFixture.SteelShield, { state: 'held', hands: 1 }),
        { ...carried(CHARM, ItemFixture.BulwarkCharm, { state: 'worn' }), ...(invested ? { invested } : {}) },
      ],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

describe('CharacterSheetPage item alterations', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows the shield and the weapon as the worn charm’s alterations change them', async () => {
    const { root } = await openSheet(wearingCharm(true), { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      const strikes = textOf(root);
      expect(strikes).toContain('Hardness 8');
      expect(strikes).toContain('Made of cold iron');
      expect(strikes).toContain('Property runes: flaming');
      expect(strikes).toContain('Agile');
    });
  });

  it('shows them unchanged while the charm is not invested', async () => {
    const { root } = await openSheet(wearingCharm(false), { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      const strikes = textOf(root);
      expect(strikes).toContain('Hardness 5');
      expect(strikes).not.toContain('Made of cold iron');
    });
  });
});
