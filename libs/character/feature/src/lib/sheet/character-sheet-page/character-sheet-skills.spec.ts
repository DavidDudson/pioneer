import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId, playerCoreId } from '@pioneer/character/domain/testing';
import { contentId, ContentKind, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { SkillPicker } from '@pioneer/rules/ui';
import type { SkillPickerRow } from '@pioneer/rules/ui';
import { describe, expect, it, vi } from 'vitest';

import { pickRow, pickValue, rowsShown } from '../../testing/origin-table-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';

const openSheet = openerAt(SheetMode.Encounter);
const openPlan = openerAt(SheetMode.Plan);

const ATHLETICS = contentId(PackId.parse('core-rules'), EntrySlug.parse('statistic:athletics'));
const TRAINING = ['Level 1 trained skill 1', 'Level 1 trained skill 2', 'Level 1 trained skill 3'];
const FIRST_SLOT = 'Level 1 trained skill 1';

/** Merisiel as a fighter, with `choices` picked besides. */
function fighter(choices: Readonly<Record<string, string>> = {}, lores: Readonly<Record<string, string>> = {}): object {
  const picks = { ...MERISIEL.build.choices, class: playerCoreClassId('fighter'), 'boost:1:class:0': 'str' };
  return { ...MERISIEL, build: { choices: { ...picks, ...choices }, lores } };
}

function skillsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector('pio-sheet-panels pio-skills'));
}

function timelineSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector('section[aria-labelledby="sheet-timeline"]'));
}

/** The labels of the Plan tab's skill pickers. */
function pickerLabels(root: HTMLElement): string[] {
  return [...timelineSection(root).querySelectorAll('pio-sheet-pick-fields fr-inline-field')].map((field) =>
    present(field.querySelector('fr-text')).textContent.trim(),
  );
}

/** The text of the Skills panel's row for `name`. */
function skillRow(root: HTMLElement, name: string): string | undefined {
  return [...skillsSection(root).querySelectorAll('fr-list-item')]
    .map((item) => item.textContent.trim())
    .find((text) => text.startsWith(name));
}

/** A rank as shown: its letter, and the name read out for it. */
interface ShownRank {
  readonly letter: string;
  readonly name: string;
}

/** The rank letter shown on the Skills section's row for `name`, and the name read out for it. */
function rankOf(root: HTMLElement, name: string): ShownRank | undefined {
  const item = [...skillsSection(root).querySelectorAll('fr-list-item')].find((each) =>
    each.textContent.trim().startsWith(name),
  );
  const rank = item?.querySelector('pio-proficiency-rank');
  const letter = rank?.querySelector('[aria-hidden="true"]')?.textContent.trim();
  const read = rank?.querySelector('.sr-only')?.textContent.trim();
  return letter === undefined || read === undefined ? undefined : { letter, name: read };
}

describe('CharacterSheetPage skills', () => {
  it('asks a fighter for its three trained skills, one picker each', async () => {
    const { root } = await openPlan(fighter());

    await vi.waitFor(() => {
      expect(pickerLabels(root)).toStrictEqual(TRAINING);
    });
  });

  it('has no skill pickers before a class is picked', async () => {
    const { root } = await openPlan(MERISIEL);

    await vi.waitFor(() => {
      expect(timelineSection(root)).toBeDefined();
    });
    expect(pickerLabels(root)).toStrictEqual([]);
  });

  it('keeps the skill pickers out of the Skills panel, which lists skills only', async () => {
    const { root } = await openSheet(fighter());

    await vi.waitFor(() => {
      expect(skillRow(root, 'Athletics')).toBeDefined();
    });
    expect(skillsSection(root).querySelectorAll('fr-inline-field')).toHaveLength(0);
    expect(skillsSection(root).textContent).not.toContain('Level 1 trained skill');
  });

  it('picks a trained skill in its slot', async () => {
    const { root } = await openPlan(fighter());
    await pickRow(root, { label: FIRST_SLOT, type: SkillPicker }, 'Athletics');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'skill-training:1:0', selection: ATHLETICS },
    });
  });

  it('offers each skill with its attribute, rank and modifier', async () => {
    const { root } = await openPlan(fighter());

    const rows = await rowsShown<SkillPickerRow, SkillPicker>(root, { label: FIRST_SLOT, type: SkillPicker });

    expect(rows.find((row) => row.name === 'Athletics')).toMatchObject({
      attribute: 'str',
      rank: 'untrained',
    });
    expect(rows.find((row) => row.name === 'Athletics')?.modifier).toBeTypeOf('number');
  });

  it('says beside the pickers which earlier slot trained a skill they cannot offer', async () => {
    const { root } = await openPlan(fighter({ 'skill-training:1:0': ATHLETICS }));

    await vi.waitFor(() => {
      expect(timelineSection(root).textContent).toContain(
        'Already trained in Athletics (from Level 1 trained skill 1)',
      );
    });
  });

  it('names the class that trained a skill the pickers cannot offer', async () => {
    const cleric = {
      ...MERISIEL,
      build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric'), 'boost:1:class:0': 'wis' } },
    };
    const { root } = await openPlan(cleric);

    await vi.waitFor(() => {
      expect(timelineSection(root).textContent).toContain('Already trained in Religion (from Cleric)');
    });
  });

  it('says nothing about trained skills while none is trained', async () => {
    const { root } = await openPlan(fighter());

    await vi.waitFor(() => {
      expect(pickerLabels(root)).toStrictEqual(TRAINING);
    });
    expect(timelineSection(root).textContent).not.toContain('Already trained');
  });

  it('totals an untrained skill from its attribute alone', async () => {
    const { root } = await openSheet(fighter());

    await vi.waitFor(() => {
      expect(skillRow(root, 'Athletics')).toContain('+1');
    });
  });

  it('raises a picked skill to trained in its total', async () => {
    const trained = await openSheet(fighter({ 'skill-training:1:0': ATHLETICS }));
    await vi.waitFor(() => {
      expect(skillRow(trained.root, 'Athletics')).toContain('+4');
    });
  });

  it('shows each skill rank as its letter, named for assistive tech', async () => {
    const { root } = await openSheet(fighter({ 'skill-training:1:0': ATHLETICS }));

    await vi.waitFor(() => {
      expect(rankOf(root, 'Athletics')).toStrictEqual({ letter: 'T', name: 'Trained' });
    });
    expect(rankOf(root, 'Acrobatics')).toStrictEqual({ letter: 'U', name: 'Untrained' });
  });

  it('lists a custom Lore the character picked with its rank, like a loaded one', async () => {
    const { root } = await openSheet(fighter({ 'skill-training:1:0': 'lore:sailing' }, { sailing: 'Sailing' }));
    const tab = await vi.waitFor(() =>
      present(
        [...skillsSection(root).querySelectorAll('fr-segmented button')].find(
          (each) => each.textContent.trim() === 'Lores',
        ),
      ),
    );
    (tab as HTMLElement).click();

    await vi.waitFor(() => {
      expect(rankOf(root, 'Sailing')).toStrictEqual({ letter: 'T', name: 'Trained' });
    });
    expect(skillRow(root, 'Sailing')).not.toContain('Lore');
    expect(skillRow(root, 'Sailing')).toMatch(/[+-]\d/u);
  });

  it('saves a Lore typed in a skill picker as a pick of its topic, with the name as typed', async () => {
    const { root } = await openPlan(fighter());
    await pickValue(root, { label: FIRST_SLOT, type: SkillPicker }, 'lore:Sailing Lore');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toMatchObject({
      patch: { field: 'selectSlot', slot: 'skill-training:1:0', selection: 'lore:sailing', loreName: 'Sailing Lore' },
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
      tab: SheetMode.Plan,
    });
    const choices = present(root.querySelector('section[aria-labelledby="sheet-choices"]'));

    await vi.waitFor(() => {
      expect(choices.textContent).toContain('Level 1 trained skill');
    });
    expect(choices.textContent).toContain('Athletics');
  });

  it('says in the rank popover, not on the row, that a skill two sources train loses the second training', async () => {
    const cleric = {
      ...MERISIEL,
      build: {
        choices: {
          ...MERISIEL.build.choices,
          class: playerCoreClassId('cleric'),
          background: playerCoreId(ContentKind.Background, 'acolyte'),
          'boost:1:class:0': 'wis',
        },
      },
    };
    const { root } = await openSheet(cleric);

    await vi.waitFor(() => {
      expect(skillRow(root, 'Religion')).toBeDefined();
    });
    expect(skillRow(root, 'Religion')).not.toContain('the second training is lost');
    const religion = [...skillsSection(root).querySelectorAll('fr-list-item')].find((item) =>
      item.textContent.trim().startsWith('Religion'),
    );
    religion?.querySelector('button')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      expect(document.querySelector('[role="tooltip"]')?.textContent).toMatch(
        /Trained by (?:Acolyte and Cleric|Cleric and Acolyte); the second training is lost/u,
      );
    });
  });
});
