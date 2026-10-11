import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

function language(name: string): string {
  return contentId(PackId.parse('core-rules'), EntrySlug.parse(`language:${name}`));
}

const COMMON = { id: language('common'), name: 'Common', source: 'ancestry', from: 'Elf' };
const ELVEN = { id: language('elven'), name: 'Elven', source: 'ancestry', from: 'Elf' };
const GOBLIN = { id: language('goblin'), name: 'Goblin', source: 'pick', slot: 'language:1:0' };
const DRACONIC = { id: language('draconic'), name: 'Draconic' };

function languagesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector('section[aria-labelledby="sheet-languages"]'));
}

/** Each language row's name and where it came from. */
function rows(root: HTMLElement): string[][] {
  return [...languagesSection(root).querySelectorAll('fr-list-item')].map((item) =>
    [...item.querySelectorAll('fr-text')].map((text) => text.textContent.trim()),
  );
}

function buttonIn(root: HTMLElement, label: string): HTMLElement | undefined {
  return [...languagesSection(root).querySelectorAll<HTMLElement>('button')].find(
    (each) => each.textContent.trim() === label || each.getAttribute('aria-label') === label,
  );
}

async function patchBody(): Promise<unknown> {
  const request = await vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
  return request.request.body;
}

describe('CharacterSheetPage languages', () => {
  it('lists the languages the server read, each with where it came from', async () => {
    const { root } = await openSheet(MERISIEL, { languages: { known: [COMMON, ELVEN, GOBLIN], open: 0 } });

    await vi.waitFor(() => {
      expect(rows(root)).toStrictEqual([
        ['Common', 'from Elf'],
        ['Elven', 'from Elf'],
        ['Goblin', 'Picked'],
      ]);
    });
    expect(buttonIn(root, 'Add language')).toBeUndefined();
  });

  it('adds a language in the next open slot', async () => {
    const languages = { known: [COMMON, ELVEN], open: 1, next: { slot: 'language:1:0', options: [DRACONIC] } };
    const { root } = await openSheet(MERISIEL, { languages });

    const add = await vi.waitFor(() => present(buttonIn(root, 'Add language')));
    add.click();
    await TestBed.inject(ApplicationRef).whenStable();
    present(languagesSection(root).querySelector<HTMLElement>('fr-select button')).click();
    await TestBed.inject(ApplicationRef).whenStable();
    const option = await vi.waitFor(() =>
      present(
        [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
          (each) => each.textContent.trim() === 'Draconic',
        ),
      ),
    );
    option.click();

    await expect(patchBody()).resolves.toMatchObject({
      patch: { field: 'selectSlot', slot: 'language:1:0', selection: language('draconic') },
    });
  });

  it('removes a picked language by clearing its slot', async () => {
    const { root } = await openSheet(MERISIEL, { languages: { known: [COMMON, GOBLIN], open: 0 } });

    const remove = await vi.waitFor(() => present(buttonIn(root, 'Remove Goblin')));
    remove.click();

    await expect(patchBody()).resolves.toMatchObject({ patch: { field: 'clearSlot', slot: 'language:1:0' } });
  });

  it('moves focus to Add language once a removal saves, not to the page', async () => {
    const { root } = await openSheet(MERISIEL, { languages: { known: [COMMON, GOBLIN], open: 0 } });
    const remove = await vi.waitFor(() => present(buttonIn(root, 'Remove Goblin')));
    remove.focus();
    remove.click();
    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );

    request.flush({
      character: { ...MERISIEL, version: 2 },
      slots: [],
      cleared: [],
      languages: { known: [COMMON], open: 1, next: { slot: 'language:1:0', options: [DRACONIC] } },
    });

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(buttonIn(root, 'Add language'));
    });
  });
});
