import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { describe, expect, it, vi } from 'vitest';

import { PACKS_WITH_CLASSES } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

/** Merisiel as a class, with `choices` picked besides. */
function as(name: 'fighter' | 'wizard'): object {
  return { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name) } } };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The entry headings' texts: tradition, preparation and where each came from, leaving the statistics out. */
function headings(root: HTMLElement): string[] {
  return [
    ...section(root).querySelectorAll(
      'pio-spellcasting fr-heading, pio-spellcasting fr-text, pio-spellcasting fr-badge',
    ),
  ]
    .filter((part) => part.closest('pio-statistics') === null)
    .map((part) => textOf(part));
}

function section(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-spellcasting"]'));
}

describe('CharacterSheetPage spellcasting', () => {
  it('lists the class’s entry with its tradition, where it came from, and its spell attack and DC', async () => {
    const { root } = await openSheet(as('wizard'), { packs: PACKS_WITH_CLASSES });

    await vi.waitFor(() => {
      expect(headings(root)).toStrictEqual(['Arcane', 'Prepared', 'from Wizard Spellcasting']);
    });
    // Intelligence +1 (the elf's boost and the wizard's key attribute, less Merisiel's voluntary flaw), trained at 1st.
    const summaries = [...section(root).querySelectorAll('summary')].map((summary) => textOf(summary));
    expect(summaries).toStrictEqual(['Spell Attack Modifier +4', 'Spell DC 14']);
  });

  it('says a class that casts no spells has none', async () => {
    const { root } = await openSheet(as('fighter'), { packs: PACKS_WITH_CLASSES });

    await vi.waitFor(() => {
      expect(textOf(section(root))).toContain('No spellcasting.');
    });
  });
});
