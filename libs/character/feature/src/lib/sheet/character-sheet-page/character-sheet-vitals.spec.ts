import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, playOf, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const CHARM = '88888888-8888-4888-8888-888888888888';
const PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];

/** Merisiel as a cleric, and an elf (Medium), wearing a charm of fast healing 2, 4 temporary Hit Points and growth. */
function wearingCharm(invested: boolean, charm: ItemFixture = ItemFixture.TrollCharm): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric') } },
    inventory: {
      items: [
        {
          id: CHARM,
          item: itemFixtureId(charm),
          quantity: 1,
          carry: { state: 'worn' },
          ...(invested ? { invested } : {}),
        },
      ],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

function vitalsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-vitals'));
}

function hitPointsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-hit-points'));
}

describe('CharacterSheetPage vitals from rule elements', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows the fast healing, temporary Hit Points and size an invested item gives', async () => {
    const { root } = await openSheet(wearingCharm(true), { play: playOf(0, 0), packs: PACKS });

    await vi.waitFor(() => {
      const text = textOf(hitPointsOf(root));
      expect(text).toContain('Fast healing 2. Stopped by Fire damage.');
      expect(text).toContain('4 temporary Hit Points from effects.');
      expect(text).toContain('Size Large, reach 10 feet.');
    });
  });

  it('shows nothing from an item that is not invested', async () => {
    const { root } = await openSheet(wearingCharm(false), { play: playOf(0, 0), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(hitPointsOf(root))).toContain('Hit Points');
    });
    const text = textOf(hitPointsOf(root));
    expect(text).not.toContain('Fast healing');
    expect(text).not.toContain('Size');
  });
});

describe('CharacterSheetPage speeds from rule elements', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows each non-land Speed an invested item upgrades, with its total', async () => {
    const { root } = await openSheet(wearingCharm(true, ItemFixture.MovementCharm), {
      play: playOf(0, 0),
      packs: PACKS,
    });

    await vi.waitFor(() => {
      const text = textOf(vitalsOf(root));
      expect(text).toMatch(/Fly Speed\s*30/u);
      expect(text).toMatch(/Swim Speed\s*20/u);
      expect(text).toMatch(/Climb Speed\s*15/u);
      expect(text).toMatch(/Burrow Speed\s*10/u);
    });
  });

  it('shows no non-land Speed the character has nothing for', async () => {
    const { root } = await openSheet(wearingCharm(false, ItemFixture.MovementCharm), {
      play: playOf(0, 0),
      packs: PACKS,
    });

    await vi.waitFor(() => {
      expect(textOf(vitalsOf(root))).toContain('Armor Class');
    });
    expect(textOf(vitalsOf(root))).not.toContain('Speed');
  });
});
