import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { HUMAN, id, MERISIEL, openSheet, patchedOf, pickAncestry, present } from '../../testing/sheet-page-harness';

/** The label of the inline field holding focus. */
function focusedField(): string | undefined {
  return document.activeElement?.closest('fr-inline-field')?.querySelector('fr-text')?.textContent.trim();
}

describe('CharacterSheetPage build', () => {
  it('summarises the build, each empty part saying what to pick', async () => {
    const { root } = await openSheet();
    const build = present(root.querySelector('section[aria-labelledby="sheet-build"]'));

    await vi.waitFor(() => {
      expect(
        [...build.querySelectorAll('fr-description-item')].map((item) => [
          item.querySelector('[role="term"]')?.textContent.trim(),
          item.querySelector('[role="definition"]')?.textContent.trim(),
        ]),
      ).toStrictEqual([
        ['Class', 'Pick a class'],
        ['Subclass', 'Pick a subclass'],
        ['Ancestry', 'Elf'],
        ['Heritage', 'Pick a heritage'],
        ['Background', 'Pick a background'],
        ['Deity', 'Pick a deity'],
        ['Key attribute', 'Pick a class and its key attribute'],
        ['Size', 'Medium'],
      ]);
    });
  });

  it('shows an empty heritage and background as not chosen, with no error', async () => {
    const { root } = await openSheet();
    const identity = present(root.querySelector('section[aria-labelledby="sheet-identity"]'));

    await vi.waitFor(() => {
      expect(identity.textContent).toContain('Not chosen');
    });
    expect(identity.querySelectorAll('fr-message')).toHaveLength(0);
  });

  it('shows a stored heritage its slot no longer offers by its value, not as not chosen', async () => {
    const unloaded = '0b7c4f5e-8d1a-5c2b-9e3f-4a6b7c8d9e0f';
    const { root } = await openSheet({
      ...MERISIEL,
      build: { choices: { ...MERISIEL.build.choices, heritage: unloaded } },
    });
    const identity = present(root.querySelector('section[aria-labelledby="sheet-identity"]'));

    await vi.waitFor(() => {
      expect(identity.textContent).toContain(unloaded);
    });
  });

  it('Edit build moves focus to the ancestry picker', async () => {
    const { root } = await openSheet();
    const build = present(root.querySelector('section[aria-labelledby="sheet-build"]'));

    present(build.querySelector<HTMLElement>('button')).click();

    expect(focusedField()).toBe('Ancestry');
  });

  it('says which heritage a new ancestry cleared until dismissed, then moves focus to the heritage picker', async () => {
    const { root } = await openSheet();
    await pickAncestry(root, 'Human');
    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    const cleared = [{ key: 'heritage', selection: 'whisper-elf', selectionName: 'Whisper Elf' }];
    request.flush(patchedOf({ ...MERISIEL, version: 2, build: { choices: { ancestry: HUMAN } } }, [], cleared));
    await vi.waitFor(async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      expect(root.textContent).toContain(
        'Whisper Elf doesn’t belong to the new ancestry, so your heritage was cleared. Pick another.',
      );
    });
    expect(root.querySelector('fr-surface [role="alert"]')?.textContent).toContain('Whisper Elf');

    const dismiss = present(
      [...root.querySelectorAll<HTMLElement>('fr-surface button')].find(
        (button) => button.textContent.trim() === 'Dismiss',
      ),
    );
    // A real click moves focus to the button first, closing the ancestry editor it leaves.
    dismiss.focus();
    dismiss.click();

    await vi.waitFor(async () => {
      await TestBed.inject(ApplicationRef).whenStable();
      expect(root.textContent).not.toContain('Whisper Elf');
      expect(focusedField()).toBe('Heritage');
    });
  });
});
