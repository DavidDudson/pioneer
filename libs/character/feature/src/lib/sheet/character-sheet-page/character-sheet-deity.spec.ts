import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { LISTBOX_PX, OPTION_PX, settle } from '../../testing/inventory-sheet-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

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

/** Opens the deity picker, types `query`, and picks the option named `name`. */
async function pickDeity(root: HTMLElement, query: string, name: string): Promise<void> {
  // Nothing is laid out in jsdom: give the virtualised listbox a height and each option a row.
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(LISTBOX_PX);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
    DOMRect.fromRect({ width: LISTBOX_PX, height: OPTION_PX }),
  );
  onTestFinished(() => {
    vi.restoreAllMocks();
  });
  const field = await vi.waitFor(() => present(deitySection(root).querySelector<HTMLElement>('fr-inline-field')));
  present(field.querySelector<HTMLElement>('button')).click();
  await settle();
  const input = present(field.querySelector<HTMLInputElement>('input[role="combobox"]'));
  input.value = query;
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
  const option = await vi.waitFor(
    () =>
      present(
        [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((each) => each.textContent.trim() === name),
      ),
    { timeout: 3000 },
  );
  option.click();
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

  it('picks a deity found by name', async () => {
    const { root } = await openSheet();

    await pickDeity(root, 'Sarenrae', 'Sarenrae');

    await expect(patchBody()).resolves.toMatchObject({
      patch: { field: 'selectSlot', slot: 'deity', selection: SARENRAE },
    });
  });

  it('clears the deity with No deity', async () => {
    const { root } = await openSheet(
      { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, deity: SARENRAE } } },
      { deity: SARENRAE_SHEET },
    );

    await pickDeity(root, '', 'No deity');

    await expect(patchBody()).resolves.toMatchObject({ patch: { field: 'clearSlot', slot: 'deity' } });
  });
});
