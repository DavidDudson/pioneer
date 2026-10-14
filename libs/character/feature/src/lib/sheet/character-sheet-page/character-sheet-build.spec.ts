import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickAncestry } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { HUMAN, id, MERISIEL, openSheet, patchedOf, present } from '../../testing/sheet-page-harness';

/** Sarenrae, who can be holy. */
const SARENRAE = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:sarenrae'));
/** Player Core's Deity (Cleric), whose sanctification `ChoiceSet` is its first rule. */
const SANCTIFICATION_SLOT = '1fa11812-c31f-5034-804b-3b86660f2193:0';

/** The label of the inline field holding focus. */
function focusedField(): string | undefined {
  return document.activeElement?.closest('fr-inline-field')?.querySelector('fr-text')?.textContent.trim();
}

describe('CharacterSheetPage build', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

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
        ['Traits', 'Elf Humanoid'],
      ]);
    });
  });

  it("names a holy cleric's traits, the ancestry's and the holy trait its sanctification gives", async () => {
    const choices = { class: playerCoreClassId('cleric'), deity: SARENRAE, [SANCTIFICATION_SLOT]: 'holy' };
    const { root } = await openSheet({ ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, ...choices } } });
    const build = present(root.querySelector('section[aria-labelledby="sheet-build"]'));

    await vi.waitFor(() => {
      const badges = [...build.querySelectorAll('fr-description-item:last-of-type fr-badge')];
      expect(badges.map((badge) => badge.textContent.trim())).toStrictEqual(['Elf', 'Holy', 'Humanoid']);
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
