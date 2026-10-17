import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

/** The core rules pack's Free Archetype, as the character's list names it. */
const freeArchetype = {
  variantId: 'e3987b2d-66c3-5fc9-a208-c77d07fbe9ef',
  name: 'Free Archetype',
  packTitle: 'Core Rules',
};
const FREE_ARCHETYPE_ON = { decidedBy: 'character', manageable: true, enabled: [freeArchetype], available: [] };

/** Merisiel as a fighter. */
const FIGHTER = { ...MERISIEL, build: { choices: { class: playerCoreClassId('fighter') } } };

/** The labels of the feat slots on the level timeline. */
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

    await vi.waitFor(() => {
      expect(timelineLabels(root)).toContain('Fighter feat, level 2');
    });
    expect(timelineLabels(root).some((label) => label.startsWith('Free archetype feat'))).toBe(false);
  });

  it('plans a free archetype feat at 2nd level and every even level once the variant is on', async () => {
    const { root } = await openSheet(FIGHTER, { characterVariantRules: FREE_ARCHETYPE_ON });

    await vi.waitFor(() => {
      const labels = timelineLabels(root).filter((label) => label.startsWith('Free archetype feat'));
      expect(labels).toStrictEqual(
        [2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((level) => `Free archetype feat, level ${level}`),
      );
    });
  });
});
