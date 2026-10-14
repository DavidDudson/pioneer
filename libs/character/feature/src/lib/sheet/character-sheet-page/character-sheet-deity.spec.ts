import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { openPickerTable } from '../../testing/feat-table-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Exploration);

const SARENRAE = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:sarenrae'));

/** Sarenrae as the server reads her for the sheet. */
const SARENRAE_SHEET = {
  id: SARENRAE,
  name: 'Sarenrae',
  description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Edicts protect allies' }] }],
  data: {
    category: 'deity',
    sanctification: { modal: 'can', what: ['holy'] },
    domains: { primary: ['fire', 'sun'], alternate: ['repose'] },
    font: ['heal'],
    attributes: ['con', 'wis'],
    skills: ['skill:medicine'],
    weapons: ['scimitar', 'khopesh'],
    spells: [],
  },
  favoredWeapons: [{ weapon: 'scimitar', name: 'Scimitar' }, { weapon: 'khopesh' }],
};

function deitySection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-deity"]'));
}

/** Each term of the deity block with its values. */
function terms(root: HTMLElement): string[][] {
  return [...deitySection(root).querySelectorAll('fr-description-item')].map((item) =>
    [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()),
  );
}

/** Opens the deity picker and picks the row named `name`. */
async function pickDeity(root: HTMLElement, name: string): Promise<void> {
  const field = await vi.waitFor(() => present(deitySection(root).querySelector<HTMLElement>('fr-inline-field')));
  const rows = await openPickerTable(field);
  present(rows.find((row) => row.name === name)).pick();
}

async function patchBody(): Promise<unknown> {
  const request = await vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
  return request.request.body;
}

describe('CharacterSheetPage deity', () => {
  it('shows the deity the server read: what it grants, its favoured weapons and its edicts', async () => {
    const { root } = await openSheet(
      { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, deity: SARENRAE } } },
      { deity: SARENRAE_SHEET },
    );

    await vi.waitFor(() => {
      expect(terms(root)).toStrictEqual([
        ['Heal'],
        ['Can be holy'],
        ['Fire', 'Sun'],
        ['Repose'],
        ['Scimitar', 'khopesh (not in the loaded content)'],
        ['Constitution', 'Wisdom'],
        ['Medicine'],
      ]);
    });
    expect(deitySection(root).textContent).toContain('Edicts protect allies');
  });

  it('says there is no deity until one is picked', async () => {
    const { root } = await openSheet();

    await vi.waitFor(() => {
      expect(deitySection(root).textContent).toContain('No deity');
    });
  });

  // Skipped: the deity table renders no rows in this harness (#734).
  // oxlint-disable-next-line vitest/no-disabled-tests -- #734
  it.skip('picks a deity from the table', async () => {
    const { root } = await openSheet();

    await pickDeity(root, 'Sarenrae');

    await expect(patchBody()).resolves.toMatchObject({
      patch: { field: 'selectSlot', slot: 'deity', selection: SARENRAE },
    });
  });

  // Skipped: the deity table renders no rows in this harness (#734).
  // oxlint-disable-next-line vitest/no-disabled-tests -- #734
  it.skip('clears the deity with No deity', async () => {
    const { root } = await openSheet(
      { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, deity: SARENRAE } } },
      { deity: SARENRAE_SHEET },
    );

    await pickDeity(root, 'No deity');

    await expect(patchBody()).resolves.toMatchObject({ patch: { field: 'clearSlot', slot: 'deity' } });
  });
});
