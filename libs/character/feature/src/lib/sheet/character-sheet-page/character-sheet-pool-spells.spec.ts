import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

/** Player Core with its spells, for the spell pickers. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Divine Font, whose `ChoiceSet` (its first rule) picks the font. */
const FONT_SLOT = 'd16ad3ee-bbb7-5b48-a4fa-edae86dd367d:0';
/** Player Core's Arcane School, whose `ChoiceSet` (its first rule) picks the school, and the School of Battle Magic. */
const SCHOOL_SLOT = '6efbc394-745c-5c78-8df1-8a3ebe1cdec2:0';
const BATTLE_MAGIC = 'cf527c20-a4c9-5301-96f8-fa4da6be9af7';
/** Player Core's heal. */
const HEAL = '949e0a89-f44b-598d-8adb-3d9d31db900e';
/** Sarenrae, whose font is healing, so a cleric of hers may pick it. */
const SARENRAE = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:sarenrae'));

/** Merisiel as a 1st-level `name`, with `choices` picked besides. */
function as(name: 'cleric' | 'wizard', choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    level: 1,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name), ...choices }, spellAccess: [] },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The prepared spell pickers, once they show. */
async function preparedOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-prepared-spells')));
}

function headingsIn(prepared: HTMLElement): string[] {
  return [...prepared.querySelectorAll('fr-heading')].map((heading) => textOf(heading));
}

/** The labels of the inline pickers within `root`. */
function pickerLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll('fr-inline-field')].map((field) => textOf(present(field.querySelector('fr-text'))));
}

describe('CharacterSheetPage pool spells', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('asks a cleric for a spell in each divine font slot, after its own, and says they wait on the font', async () => {
    const { root } = await openSheet(as('cleric'));
    const prepared = await preparedOf(root);

    await vi.waitFor(() => {
      expect(headingsIn(prepared)).toStrictEqual([
        'Prepared spells: Divine',
        'Cantrips, cast at 1st rank',
        '1st rank',
        'Divine Font, 1st rank',
      ]);
    });
    expect(pickerLabels(prepared).slice(-4)).toStrictEqual([
      'Divine Font 1st rank slot 1',
      'Divine Font 1st rank slot 2',
      'Divine Font 1st rank slot 3',
      'Divine Font 1st rank slot 4',
    ]);
    expect(textOf(prepared)).toContain('These slots take no spell until the Divine Font choice is made.');
  });

  it('shows a healing font’s prepared heal by name, with no note once the font is picked', async () => {
    const choices = { deity: SARENRAE, [FONT_SLOT]: 'heal', 'prepared:cleric:divine-font:1:0': HEAL };
    const { root } = await openSheet(as('cleric', choices), { packs: SPELL_PACKS });
    const prepared = await preparedOf(root);

    await vi.waitFor(() => {
      const font = [...prepared.querySelectorAll('fr-inline-field')].at(-4);
      expect(textOf(present(font))).toContain('Heal');
    });
    expect(textOf(prepared)).not.toContain('These slots take no spell until');
  });

  it("asks a wizard for its school's curriculum cantrip and 1st-rank spell, under the school's name", async () => {
    const { root } = await openSheet(as('wizard', { [SCHOOL_SLOT]: BATTLE_MAGIC }));
    const prepared = await preparedOf(root);

    await vi.waitFor(() => {
      expect(headingsIn(prepared).slice(-2)).toStrictEqual([
        'School of Battle Magic cantrips, cast at 1st rank',
        'School of Battle Magic, 1st rank',
      ]);
    });
    expect(pickerLabels(prepared).slice(-2)).toStrictEqual([
      'School of Battle Magic cantrip 1',
      'School of Battle Magic 1st rank slot 1',
    ]);
    expect(textOf(prepared)).not.toContain('These slots take no spell until');
  });
});
