import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { PACKS_WITH_CLASSES } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

const ATHLETICS = contentId(PackId.parse('core-rules'), EntrySlug.parse('statistic:athletics'));
const TRAINING = ['Level 1 trained skill 1', 'Level 1 trained skill 2', 'Level 1 trained skill 3'];

/** Merisiel as a fighter, with `choices` picked besides. */
function fighter(choices: Readonly<Record<string, string>> = {}): object {
  const picks = { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' };
  return { ...MERISIEL, build: { choices: { ...picks, ...choices } } };
}

function skillsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector('section[aria-labelledby="sheet-skills"]'));
}

/** The labels of the Skills section's pickers. */
function pickerLabels(root: HTMLElement): string[] {
  return [...skillsSection(root).querySelectorAll('fr-inline-field')].map((field) =>
    present(field.querySelector('fr-text')).textContent.trim(),
  );
}

/** The text of the Skills section's row for `name`. */
function skillRow(root: HTMLElement, name: string): string | undefined {
  return [...skillsSection(root).querySelectorAll('fr-list-item')]
    .map((item) => item.textContent.trim())
    .find((text) => text.startsWith(name));
}

describe('CharacterSheetPage skills', () => {
  it('asks a fighter for its three trained skills, one picker each', async () => {
    const { root } = await openSheet(fighter(), { packs: PACKS_WITH_CLASSES });

    await vi.waitFor(() => {
      expect(pickerLabels(root)).toStrictEqual(TRAINING);
    });
  });

  it('has no skill pickers before a class is picked', async () => {
    const { root } = await openSheet(MERISIEL, { packs: PACKS_WITH_CLASSES });

    await vi.waitFor(() => {
      expect(skillRow(root, 'Athletics')).toBeDefined();
    });
    expect(pickerLabels(root)).toStrictEqual([]);
  });

  it('picks a trained skill in its slot', async () => {
    const { root } = await openSheet(fighter(), { packs: PACKS_WITH_CLASSES });
    const field = await vi.waitFor(() => present(skillsSection(root).querySelector<HTMLElement>('fr-inline-field')));

    present(field.querySelector<HTMLElement>('button')).click();
    await TestBed.inject(ApplicationRef).whenStable();
    present(field.querySelector<HTMLElement>('[frInlineEditor] button')).click();
    await TestBed.inject(ApplicationRef).whenStable();
    const option = await vi.waitFor(() =>
      present(
        [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
          (each) => each.textContent.trim() === 'Athletics',
        ),
      ),
    );
    option.click();

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'skill-training:1:0', selection: ATHLETICS },
    });
  });

  it('totals an untrained skill from its attribute alone', async () => {
    const { root } = await openSheet(fighter(), { packs: PACKS_WITH_CLASSES });

    await vi.waitFor(() => {
      expect(skillRow(root, 'Athletics')).toContain('+1');
    });
  });

  it('raises a picked skill to trained in its total', async () => {
    const trained = await openSheet(fighter({ 'skill-training:1:0': ATHLETICS }), { packs: PACKS_WITH_CLASSES });
    await vi.waitFor(() => {
      expect(skillRow(trained.root, 'Athletics')).toContain('+4');
    });
  });

  it('names a skill slot in the Choices section by its level', async () => {
    const slot = {
      status: 'filled',
      key: 'skill-training:1:0',
      subject: { kind: 'skill', source: 'training', level: 1 },
      selection: ATHLETICS,
      selectionName: 'Athletics',
    };
    const { root } = await openSheet(fighter({ 'skill-training:1:0': ATHLETICS }), {
      slots: [slot],
      packs: PACKS_WITH_CLASSES,
    });
    const choices = present(root.querySelector('section[aria-labelledby="sheet-choices"]'));

    await vi.waitFor(() => {
      expect(choices.textContent).toContain('Level 1 trained skill');
    });
    expect(choices.textContent).toContain('Athletics');
  });
});
