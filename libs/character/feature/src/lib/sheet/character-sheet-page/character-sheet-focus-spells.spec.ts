import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

/** Player Core with its spells, for the focus spells' names. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Arcane School, whose `ChoiceSet` (its first rule) picks the school, and the School of Battle Magic. */
const SCHOOL_SLOT = '6efbc394-745c-5c78-8df1-8a3ebe1cdec2:0';
const BATTLE_MAGIC = 'cf527c20-a4c9-5301-96f8-fa4da6be9af7';

/** Merisiel as a `name` of `level`, with `choices` picked besides. */
function as(name: 'bard' | 'wizard', level: number, choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    level,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name), ...choices }, spellAccess: [] },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The focus spells list once its spells load, past the placeholder shown while they do. */
async function focusOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() =>
    present(
      [...root.querySelectorAll<HTMLElement>('pio-focus-spells')].find(
        (each) => each.querySelector('fr-heading') !== null,
      ),
    ),
  );
}

/** Each spell's name and badges: the first row of its details. */
function spellsIn(focus: HTMLElement): string[] {
  return [...focus.querySelectorAll('pio-spell-details')].map((details) =>
    [...details.querySelectorAll('pio-entry-hover fr-text, fr-badge')].map((part) => textOf(part)).join(' '),
  );
}

/** Each spell's labelled fields as "Term: value", under its name. */
function fieldsOf(focus: HTMLElement, name: string): string[] {
  const details = [...focus.querySelectorAll('pio-spell-details')].find((each) => textOf(each).startsWith(name));
  return [...(details?.querySelectorAll('fr-description-item') ?? [])].map((row) =>
    [...row.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(': '),
  );
}

describe('CharacterSheetPage focus spells', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("details a bard's composition spells by cost, area and duration", async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(fieldsOf(focus, 'Courageous Anthem')).toStrictEqual(['Area: 60-foot emanation', 'Duration: 1 round']);
    });
    expect(textOf(focus)).toContain('Reaction');
    expect(textOf(focus)).toContain('Single action');
  });

  it("lists a bard's composition spells, the cantrip marked, with a focus pool of 1", async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Counter Performance Focus', 'Courageous Anthem Cantrip']);
    });
    expect(textOf(focus)).toContain('Focus pool: 1 Focus Point');
    expect(textOf(focus)).toContain('Cast at 1st rank, cantrips too');
    expect(textOf(focus)).toContain('Occult');
  });

  it("casts a wizard's school spell at half the level, rounded up", async () => {
    const { root } = await openSheet(as('wizard', 5, { [SCHOOL_SLOT]: BATTLE_MAGIC }), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Force Bolt Focus']);
    });
    expect(textOf(focus)).toContain('Cast at 3rd rank, cantrips too');
    expect(fieldsOf(focus, 'Force Bolt')).toStrictEqual([
      'Range: 30 feet',
      'Targets: 1 creature',
      'Effect: 2d4+2 force',
    ]);
  });

  it('shows no focus spells for a character with no focus entry', async () => {
    const { root } = await openSheet(as('wizard', 1), { packs: SPELL_PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(root.querySelector('pio-focus-spells')).toBeNull();
  });
});
