import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentKind, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { classFeatSlotKey } from '../../testing/class-feat-slots';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { TEST_PACKS } from '../../testing/test-packs';

const PACK = 'medic-archetype';
const builder = new ContentPackBuilder().withId(PACK);
const medic = builder
  .withFeat('medic-dedication', {
    traits: ['fighter', 'archetype', 'dedication'],
    data: { category: 'class', archetype: builder.idOf(ContentKind.Archetype, 'medic') },
  })
  .withItem(ContentKind.Archetype, 'medic', { dedication: builder.idOf(ContentKind.Feat, 'medic-dedication') })
  .build();

const MEDIC: PackContentsLoader = {
  id: PackId.parse(PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: PACK, title: 'Medic', publisher: 'Pioneer tests', license: 'homebrew' }, [
      medic.otherEntries,
    ]),
};
const MEDIC_PACKS = [...TEST_PACKS, MEDIC];
const MEDIC_DEDICATION = present(medic.otherEntries.find((entry) => entry.name === 'Medic-dedication')).id;
/** Player Core's fighter's 1st-level class feat slot: the class and the rule index of its `ChoiceSet`. */
const FIGHTER_FEAT_1 = await classFeatSlotKey('fighter', 1);

/** Merisiel as a 1st-level fighter, with `choices` picked besides. */
function fighter(choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), ...choices } },
  };
}

describe('CharacterSheetPage archetype progress', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], MEDIC_PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows nothing before a dedication is taken', async () => {
    const { root } = await openSheet(fighter(), { packs: MEDIC_PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-archetype-progress')).not.toBeNull();
    });
    expect(root.querySelector('pio-sheet-archetype-progress fr-message')).toBeNull();
  });

  it('shows the feats taken against the lock once a dedication is taken', async () => {
    const { root } = await openSheet(fighter({ [FIGHTER_FEAT_1]: MEDIC_DEDICATION }), { packs: MEDIC_PACKS });

    await vi.waitFor(() => {
      const text = root.querySelector('pio-sheet-archetype-progress fr-message')?.textContent.replaceAll(/\s+/gu, ' ');
      expect(text).toContain('Medic: 0 of 2 feats before your next dedication.');
    });
  });
});
