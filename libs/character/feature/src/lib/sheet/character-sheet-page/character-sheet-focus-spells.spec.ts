import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

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

function spellsIn(focus: HTMLElement): string[] {
  return [...focus.querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text, fr-badge')].map((part) => textOf(part)).join(' '),
  );
}

describe('CharacterSheetPage focus spells', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("lists a bard's composition spells, the cantrip marked, with a focus pool of 1", async () => {
    const { root } = await openSheet(as('bard', 1), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Counter Performance', 'Courageous Anthem Cantrip']);
    });
    expect(textOf(focus)).toContain('Focus pool: 1 Focus Point');
    expect(textOf(focus)).toContain('Cast at 1st rank, cantrips too');
    expect(textOf(focus)).toContain('Occult');
  });

  it("casts a wizard's school spell at half the level, rounded up", async () => {
    const { root } = await openSheet(as('wizard', 5, { [SCHOOL_SLOT]: BATTLE_MAGIC }), { packs: SPELL_PACKS });
    const focus = await focusOf(root);

    await vi.waitFor(() => {
      expect(spellsIn(focus)).toStrictEqual(['Force Bolt']);
    });
    expect(textOf(focus)).toContain('Cast at 3rd rank, cantrips too');
  });

  it('shows no focus spells for a character with no focus entry', async () => {
    const { root } = await openSheet(as('wizard', 1), { packs: SPELL_PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(root.querySelector('pio-focus-spells')).toBeNull();
  });
});
