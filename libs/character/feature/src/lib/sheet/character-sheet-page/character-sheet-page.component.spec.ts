import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { AttributePicker } from '@pioneer/rules/ui';
import type { AttributePickerRow } from '@pioneer/rules/ui';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickAncestry, pickRow, rowsShown } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { HUMAN, id, MERISIEL, openSheet, patchedOf, present } from '../../testing/sheet-page-harness';
import { openTab, regionsOf, settle } from '../../testing/sheet-tabs-testing';

describe('CharacterSheetPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('puts each section on its tab, each a region under a level 2 heading', async () => {
    const { root } = await openSheet();

    expect(regionsOf(root)).toStrictEqual([
      ['Identity', true],
      ['Build', true],
      ['Attributes', true],
      ['Choices', true],
      ['Level timeline', true],
      ['Feats', true],
      ['Class features', true],
      ['Content packs', true],
      ['Variant rules', true],
    ]);
    await openTab(root, 'Encounter', 'Defences');
    expect(regionsOf(root)).toStrictEqual([
      ['Defences', true],
      ['Skills', true],
      ['Strikes', true],
      ['Actions', true],
      ['Spellcasting', true],
    ]);
    await openTab(root, 'Exploration', 'Appearance and personality');
    expect(regionsOf(root)).toStrictEqual([
      ['Appearance and personality', true],
      ['Exploration activity', true],
      ['Actions', true],
      ['Deity', true],
      ['Languages', true],
      ['Inventory', true],
    ]);
    await openTab(root, 'Downtime', 'Rest and preparations');
    expect(regionsOf(root)).toStrictEqual([
      ['Rest and preparations', true],
      ['Actions', true],
      ['Downtime', true],
    ]);
  });

  it("indexes the open tab's sections with skip links that move focus to their headings", async () => {
    const { root } = await openSheet();
    const nav = present(root.querySelector('nav[aria-label="Sheet sections"]'));
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((link) => link.textContent.trim())).toStrictEqual([
      'Identity',
      'Build',
      'Attributes',
      'Choices',
      'Level timeline',
      'Feats',
      'Class features',
      'Content packs',
      'Variant rules',
    ]);

    links[2]?.click();

    expect(document.activeElement?.textContent.trim()).toBe('Attributes');
    expect(document.activeElement?.tagName).toBe('H2');
  });

  it('lists a row for each level from 1 to 20 on the Plan tab, marking the current one in text', async () => {
    const { root } = await openSheet();
    const timeline = present(root.querySelector('section[aria-labelledby="sheet-timeline"]'));
    const levelHeadings = (): string[] =>
      [...timeline.querySelectorAll('pio-level-timeline-level fr-heading')].map((heading) =>
        heading.textContent.trim(),
      );
    await vi.waitFor(() => {
      expect(levelHeadings()).toHaveLength(20);
    });
    const headings = levelHeadings();

    expect(headings).toHaveLength(20);
    expect(headings.at(0)).toBe('Level 1');
    expect(headings.at(-1)).toBe('Level 20');
    expect(
      [...timeline.querySelectorAll('fr-badge')].filter((badge) => badge.textContent.trim() === 'Current level'),
    ).toHaveLength(1);
  });

  it('lists every choice with its status, flagging a planned pick and an invalid one with its reason', async () => {
    const { root } = await openSheet();
    const choices = present(root.querySelector('section[aria-labelledby="sheet-choices"]'));

    expect(
      [...choices.querySelectorAll('fr-list-item')].map((item) =>
        [...item.querySelectorAll('fr-text, fr-badge')].map((part) => part.textContent.trim()).join(' '),
      ),
    ).toStrictEqual([
      'Ancestry Elf Chosen',
      'Background Not chosen',
      'Ancestry boost Constitution Needs a new choice This choice no longer offers that option, so it counts for nothing. Choose another.',
      'Level 5 boost Strength Planned for level 5',
      'Voluntary flaw Intelligence Chosen',
    ]);
  });

  it('shows the modifiers the picks give: the elf’s fixed boosts and flaw, each boost, then the voluntary flaw', async () => {
    const { root } = await openSheet();
    const attributes = present(root.querySelector('section[aria-labelledby="sheet-attributes"]'));

    await vi.waitFor(() => {
      expect(
        [...attributes.querySelectorAll('fr-description-item')].map((item) => [
          item.querySelector('[role="term"]')?.textContent.trim(),
          item.querySelector('[role="definition"]')?.textContent.trim(),
        ]),
      ).toStrictEqual([
        ['Strength', '+0'],
        ['Dexterity', '+2'],
        ['Constitution', '+1'],
        ['Intelligence', '+0'],
        ['Wisdom', '+1'],
        ['Charisma', '+0'],
      ]);
    });
  });

  it('lists the boosts still to place up to the character’s level, and none planned above it', async () => {
    const { root } = await openSheet();
    const attributes = present(root.querySelector('section[aria-labelledby="sheet-attributes"]'));

    await vi.waitFor(() => {
      expect(attributes.textContent).toContain('Boosts still to place');
    });
    expect([...attributes.querySelectorAll('fr-list-item')].map((item) => item.textContent.trim())).toStrictEqual([
      'Level 1 boost',
    ]);
  });

  it('edits only the chosen inputs inline on Plan: name, ancestry, heritage, background, level, class and feats', async () => {
    const { root } = await openSheet();
    const inlineLabels = (): string[] =>
      [...root.querySelectorAll('section fr-inline-field')]
        .filter((field) => field.closest('pio-level-timeline') === null)
        .map((field) => present(field.querySelector('fr-text')).textContent.trim());
    // The feat slot renders once the feats' content has loaded, which can trail the sheet's first paint.
    await vi.waitFor(() => {
      expect(inlineLabels()).toStrictEqual([
        'Name',
        'Ancestry',
        'Heritage',
        'Background',
        'Level',
        'Class',
        'Elf feat, level 1',
      ]);
    });
  });

  it('offers a picker on each planned slot of the level timeline', async () => {
    const { root } = await openSheet();
    // The feat slots render once the feats' content has loaded, which can trail the sheet's first paint.
    await vi.waitFor(() => {
      const labels = [...root.querySelectorAll('pio-level-timeline fr-inline-field')].map((field) =>
        present(field.querySelector('fr-text')).textContent.trim(),
      );
      expect(labels).toContain('Elf feat, level 5');
      expect(labels.filter((label) => label.startsWith('Level 5 boost'))).toHaveLength(4);
      expect(labels).toContain('Level 20 boost 1');
    });
  });

  it('lists the attributes with their modifier now and with the boost for a boost planned from the timeline', async () => {
    const { root } = await openSheet();
    const rows = await rowsShown<AttributePickerRow, AttributePicker>(root, {
      label: 'Level 5 boost 2',
      type: AttributePicker,
    });
    const dexterity = present(rows.find((each) => each.name === 'Dexterity'));
    expect(dexterity.boosted).toBe(dexterity.modifier + 1);
  });

  it('saves a boost planned from the timeline as a pick in its own slot', async () => {
    const { root } = await openSheet();
    await pickRow(root, { label: 'Level 5 boost 2', type: AttributePicker }, 'Dexterity');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toStrictEqual({
      expectedVersion: 1,
      patch: { field: 'selectSlot', slot: 'boost:5:free:1', selection: 'dex' },
    });
  });

  it('saves an ancestry edit as a pick in the ancestry slot', async () => {
    const { root } = await openSheet();
    const field = await pickAncestry(root, 'Human');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    expect(request.request.body).toStrictEqual({
      expectedVersion: 1,
      patch: { field: 'selectSlot', slot: 'ancestry', selection: HUMAN },
    });
    request.flush(patchedOf({ ...MERISIEL, version: 2, build: { choices: { ancestry: HUMAN } } }, []));
    await vi.waitFor(async () => {
      await settle();
      expect(field.textContent).toContain('Human');
    });
  });

  it('shows a refused ancestry pick in the field, with the server’s reason', async () => {
    const { root } = await openSheet();
    const field = await pickAncestry(root, 'Human');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    request.flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['patch', 'selection'], message: { key: 'character.validation.selectionNotOffered' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await vi.waitFor(async () => {
      await settle();
      expect(field.textContent).toContain('That option is not available for this choice at any level.');
    });
  });

  it('shows the defences the engine derives on Encounter, each list empty until rule elements are in play', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter });
    const defences = present(root.querySelector('section[aria-labelledby="sheet-defences"]'));

    await vi.waitFor(() => {
      expect(
        [...defences.querySelectorAll('h3, fr-empty-state')].map((element) => element.textContent.trim()),
      ).toStrictEqual([
        'Immunities',
        'No immunities.',
        'Weaknesses',
        'No weaknesses.',
        'Resistances',
        'No resistances.',
      ]);
    });
  });
});
