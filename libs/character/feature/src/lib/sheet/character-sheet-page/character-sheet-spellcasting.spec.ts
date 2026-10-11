import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, onTestFinished, vi } from 'vitest';

import { LISTBOX_PX, OPTION_PX, settle } from '../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

/** Player Core with its spells, for the spell pickers. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Detect Magic, a cantrip of every tradition. */
const DETECT_MAGIC = 'c91ac947-a9ec-5f07-b5f9-a054617eb571';

/** Merisiel as a class, with `choices` picked besides. */
function as(name: 'fighter' | 'wizard'): object {
  return { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name) } } };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The entry headings' texts: tradition, preparation and where each came from, leaving the statistics and slots out. */
function headings(root: HTMLElement): string[] {
  return [
    ...section(root).querySelectorAll(
      'pio-spellcasting fr-heading, pio-spellcasting fr-text, pio-spellcasting fr-badge',
    ),
  ]
    .filter((part) => part.closest('pio-statistics') === null && part.closest('pio-spell-slots') === null)
    .map((part) => textOf(part));
}

/** Each slot list's rows as their term and count. */
function slotRows(root: HTMLElement): string[] {
  return [...section(root).querySelectorAll('pio-spell-slots fr-description-item')].map((row) =>
    [...row.querySelectorAll('[role=term], [role=definition]')].map((part) => textOf(part)).join(' '),
  );
}

/** The labels of the inline pickers within `root`. */
function pickerLabels(root: HTMLElement): string[] {
  return [...root.querySelectorAll('fr-inline-field')].map((field) => textOf(present(field.querySelector('fr-text'))));
}

function section(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-spellcasting"]'));
}

describe('CharacterSheetPage spellcasting', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('lists the class’s entry with its tradition, where it came from, and its spell attack, DC and slots', async () => {
    const { root } = await openSheet(as('wizard'));

    await vi.waitFor(() => {
      expect(headings(root)).toStrictEqual(['Arcane', 'Prepared', 'from Wizard Spellcasting']);
    });
    // Intelligence +1 (the elf's boost and the wizard's key attribute, less Merisiel's voluntary flaw), trained at 1st.
    const summaries = [...section(root).querySelectorAll('summary')].map((summary) => textOf(summary));
    expect(summaries).toStrictEqual(['Spell Attack Modifier +4', 'Spell DC 14']);
    expect(slotRows(root)).toStrictEqual(['Cantrips 5', '1st rank 2']);
  });

  it('says a class that casts no spells has none', async () => {
    const { root } = await openSheet(as('fighter'));

    await vi.waitFor(() => {
      expect(textOf(section(root))).toContain('No spellcasting.');
    });
  });

  it('asks a wizard for a spell in each cantrip and 1st-rank slot, under a heading per rank', async () => {
    const { root } = await openSheet(as('wizard'));

    const prepared = await vi.waitFor(() =>
      present(section(root).querySelector<HTMLElement>('pio-sheet-prepared-spells')),
    );
    await vi.waitFor(() => {
      expect(pickerLabels(prepared)).toStrictEqual([
        'Cantrip 1',
        'Cantrip 2',
        'Cantrip 3',
        'Cantrip 4',
        'Cantrip 5',
        '1st rank slot 1',
        '1st rank slot 2',
      ]);
    });
    const rankHeadings = [...prepared.querySelectorAll('fr-heading')].map((heading) => textOf(heading));
    expect(rankHeadings).toStrictEqual(['Prepared spells: Arcane', 'Cantrips, cast at 1st rank', '1st rank']);
    const access = present(section(root).querySelector('pio-spell-access'));
    expect(textOf(access)).toContain('No access to uncommon or rare spells yet.');
  });

  it('prepares a cantrip by searching for it', async () => {
    const { root } = await openSheet(as('wizard'), { packs: SPELL_PACKS });
    const prepared = await vi.waitFor(() =>
      present(section(root).querySelector<HTMLElement>('pio-sheet-prepared-spells')),
    );
    const cantrip = await vi.waitFor(() => present(prepared.querySelector<HTMLElement>('fr-inline-field')));

    // Nothing is laid out in jsdom: give the virtualised listbox a height and each option a row.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(LISTBOX_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: LISTBOX_PX, height: OPTION_PX }),
    );
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    present(cantrip.querySelector<HTMLElement>('button')).click();
    await settle();
    const input = present(cantrip.querySelector<HTMLInputElement>('input[role="combobox"]'));
    input.value = 'Detect';
    input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    const option = await vi.waitFor(
      () =>
        present(
          [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
            (each) => each.textContent.trim() === 'Detect Magic',
          ),
        ),
      { timeout: 3000 },
    );
    option.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'prepared:wizard:cantrip:0', selection: DETECT_MAGIC },
    });
  });
});
