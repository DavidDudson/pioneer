import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { openLevel } from '../../testing/sheet-tabs-testing';

/** The core rules pack's Free Archetype, as the character's list names it. */
const freeArchetype = {
  variantId: 'e3987b2d-66c3-5fc9-a208-c77d07fbe9ef',
  name: 'Free Archetype',
  packTitle: 'Core Rules',
};
const FREE_ARCHETYPE_ON = { decidedBy: 'character', manageable: true, enabled: [freeArchetype], available: [] };

/** Merisiel as a fighter. */
const FIGHTER = { ...MERISIEL, build: { choices: { class: playerCoreClassId('fighter') } } };

/** The labels of the slots on the level timeline, which shows the level that is open. */
function timelineLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll('pio-level-timeline fr-inline-field')].map((field) =>
    present(field.querySelector('fr-text')).textContent.trim(),
  );
}

describe('CharacterSheetPage with Free Archetype', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('has no free archetype feat slots while the variant is off', async () => {
    const { root } = await openSheet(FIGHTER);
    await openLevel(root, 2);

    await vi.waitFor(() => {
      expect(timelineLabels(root)).toContain('Fighter feat, level 2');
    });
    expect(timelineLabels(root).some((label) => label.startsWith('Free archetype feat'))).toBe(false);
  });

  it('plans a free archetype feat at 2nd level and every even level once the variant is on', async () => {
    const { root } = await openSheet(FIGHTER, { characterVariantRules: FREE_ARCHETYPE_ON });

    const levels = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    for (const level of levels) {
      // oxlint-disable-next-line eslint/no-await-in-loop -- each level opens in turn, on the one sheet
      await openLevel(root, level);
      // oxlint-disable-next-line eslint/no-await-in-loop -- the level must show before the next opens
      await vi.waitFor(() => {
        expect(timelineLabels(root).filter((label) => label.startsWith('Free archetype feat'))).toStrictEqual([
          `Free archetype feat, level ${level}`,
        ]);
      });
    }
  });
});
