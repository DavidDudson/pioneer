import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

/** Player Core's Divine Font, whose `ChoiceSet` (its first rule) picks the font. */
const FONT_SLOT = 'd16ad3ee-bbb7-5b48-a4fa-edae86dd367d:0';
/** Sarenrae, whose font is healing. */
const SARENRAE = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:sarenrae'));

/** Merisiel as a 1st-level cleric of Sarenrae, with `choices` picked besides. */
function cleric(choices: Readonly<Record<string, string>> = {}): object {
  return {
    ...MERISIEL,
    level: 1,
    build: {
      choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric'), deity: SARENRAE, ...choices },
      spellAccess: [],
    },
  };
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

function choicesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-choices"]'));
}

/** The Choices section's picker labelled `label`, once it shows. */
async function pickerOf(root: HTMLElement, label: string): Promise<HTMLElement> {
  return vi.waitFor(() =>
    present(
      [...choicesSection(root).querySelectorAll<HTMLElement>('pio-sheet-pick-fields fr-inline-field')].find(
        (field) => textOf(present(field.querySelector('fr-text'))) === label,
      ),
    ),
  );
}

/** Opens `field`'s picker and picks the option named `name`. */
async function pick(field: HTMLElement, name: string): Promise<void> {
  present(field.querySelector<HTMLElement>('button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  present(field.querySelector<HTMLElement>('[frInlineEditor] button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  const option = await vi.waitFor(() =>
    present([...document.querySelectorAll<HTMLElement>('[role="option"]')].find((each) => textOf(each) === name)),
  );
  option.click();
}

describe('CharacterSheetPage choice pickers', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("asks a cleric for the deity's divine font in the Choices section, and saves the pick", async () => {
    const { root } = await openSheet(cleric());
    const font = await pickerOf(root, 'Divine Font: Select a Divine Font.');

    await pick(font, 'Healing');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({ patch: { field: 'selectSlot', slot: FONT_SLOT, selection: 'heal' } });
  });

  it('shows a picked choice by its option name', async () => {
    const { root } = await openSheet(cleric({ [FONT_SLOT]: 'heal' }));
    const font = await pickerOf(root, 'Divine Font: Select a Divine Font.');

    await vi.waitFor(() => {
      expect(textOf(font)).toContain('Healing');
    });
  });

  it('asks nothing of a character whose choices all query content', async () => {
    const { root } = await openSheet();

    await vi.waitFor(() => {
      expect(choicesSection(root).querySelector('pio-choices fr-list')).not.toBeNull();
    });
    expect(choicesSection(root).querySelectorAll('pio-sheet-pick-fields fr-inline-field')).toHaveLength(0);
  });
});
