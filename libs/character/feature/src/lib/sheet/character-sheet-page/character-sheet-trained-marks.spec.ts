import { playerCoreClassId, playerCoreId } from '@pioneer/character/domain/testing';
import { ContentKind, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { ClassPicker, SubclassPicker } from '@pioneer/rules/ui';
import type { ClassPickerRow, SubclassPickerRow } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { openFeatTable } from '../../testing/feat-table-testing';
import { backgroundRowsShown, rowsShown } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { TEST_PACKS } from '../../testing/test-packs';

const MARKS_PACK = 'trained-marks';
const FIGHTER = ['fighter'];
const TRAINS_RELIGION = [{ key: 'Proficiency', selector: 'skill:religion', rank: 'trained' }];

/** A doctrine and a cleric feat that train Religion, which a cleric is trained in, and one of each that train nothing. */
const marks = new ContentPackBuilder()
  .withId(MARKS_PACK)
  .withClassFeature('devout-doctrine', { tags: ['cleric-doctrine'], rules: TRAINS_RELIGION })
  .withClassFeature('plain-doctrine', { tags: ['cleric-doctrine'] })
  .withFeat('canon-student', { traits: FIGHTER, rules: TRAINS_RELIGION })
  .withFeat('plain-feat', { traits: FIGHTER })
  .build();

const MARKS: PackContentsLoader = {
  id: PackId.parse(MARKS_PACK),
  load: async (): Promise<PackContents> =>
    packContentsFromFiles({ id: MARKS_PACK, title: 'Trained marks', publisher: 'Pioneer tests', license: 'homebrew' }, [
      marks.otherEntries,
    ]),
};
const PACKS = [...TEST_PACKS, MARKS];

const ACOLYTE = playerCoreId(ContentKind.Background, 'acolyte');
const MARK = 'Already trained in Religion';

/** The class slot the server reads for a cleric. */
const CLERIC_SLOT = {
  status: 'filled',
  key: 'class',
  subject: { kind: 'root', content: 'class' },
  selection: playerCoreClassId('cleric'),
  selectionName: 'Cleric',
};
const AS_CLERIC = { packs: PACKS, slots: [CLERIC_SLOT] };

/** Merisiel as a 1st-level cleric, with `choices` picked besides. */
function cleric(choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric'), ...choices } },
  };
}

/** Merisiel as a 1st-level fighter, with `choices` picked besides. */
function fighter(choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), ...choices } },
  };
}

async function fieldNamed(root: HTMLElement, label: string): Promise<HTMLElement> {
  return vi.waitFor(() =>
    present(
      [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
        (each) => each.querySelector('fr-text')?.textContent.trim() === label,
      ),
    ),
  );
}

describe('CharacterSheetPage options that train a skill again', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('marks the background that trains a skill the class trains, and leaves it pickable', async () => {
    const { root } = await openSheet(cleric(), AS_CLERIC);

    const rows = await backgroundRowsShown(root);

    // Every pack that adds a Religion background adds to this list, so it names only the ones to keep.
    const marked = rows.filter((row) => row.note !== undefined);

    expect(marked.map((row) => row.name)).toStrictEqual(
      expect.arrayContaining([
        'Absalom Street Preacher',
        'Acolyte',
        'Blooded by the Dead',
        'Combat Chaplain',
        'Local Savior',
        'Otherworldly Mission',
        'Pilgrim',
        'Revenant',
        'Seer of the Dead',
        'Street Preacher',
        'Wandering Preacher',
      ]),
    );
    expect(marked.map((row) => [row.note, row.disabledReason])).toStrictEqual(marked.map(() => [MARK, undefined]));
  });

  it('marks the class that trains a skill the background trains', async () => {
    const { root } = await openSheet(
      { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, background: ACOLYTE } } },
      { packs: PACKS },
    );

    const rows = await rowsShown<ClassPickerRow, ClassPicker>(root, { label: 'Class', type: ClassPicker });

    expect(rows.map((row) => [row.name, row.note, row.disabledReason])).toContainEqual(['Cleric', MARK, undefined]);
    expect(rows.map((row) => [row.name, row.note, row.disabledReason])).toContainEqual([
      'Fighter',
      undefined,
      undefined,
    ]);
  });

  it('marks the subclass that trains a skill the class trains', async () => {
    const { root } = await openSheet(cleric(), AS_CLERIC);

    const rows = await rowsShown<SubclassPickerRow, SubclassPicker>(root, { label: 'Subclass', type: SubclassPicker });

    expect(rows.map((row) => [row.name, row.note, row.disabledReason])).toContainEqual([
      'Devout-doctrine',
      MARK,
      undefined,
    ]);
    expect(rows.map((row) => [row.name, row.note, row.disabledReason])).toContainEqual([
      'Plain-doctrine',
      undefined,
      undefined,
    ]);
  });

  // Skipped: the feat table renders no rows in this harness (#734).
  // oxlint-disable-next-line vitest/no-disabled-tests -- #734
  it.skip('marks the feat that trains a skill the background trains, and leaves it pickable', async () => {
    const { root } = await openSheet(fighter({ background: ACOLYTE }), { packs: PACKS });
    const slot = await vi.waitFor(async () => fieldNamed(root, 'Fighter feat, level 1'));

    const rows = await openFeatTable(slot, 2);

    expect(rows.map(({ name, disabled }) => [name, disabled])).toStrictEqual([
      ['Canon-student', false],
      ['Plain-feat', false],
    ]);
    expect(rows[0]?.cells).toContain(MARK);
    expect(rows[1]?.cells.join(' ')).not.toContain('Already trained');
  });

  it('marks nothing before the character is trained in the skill', async () => {
    const { root } = await openSheet(MERISIEL, { packs: PACKS });

    const rows = await backgroundRowsShown(root);

    expect(rows.filter((row) => row.note !== undefined)).toStrictEqual([]);
  });
});
