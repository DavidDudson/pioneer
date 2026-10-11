import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { HUMAN, id, MERISIEL, openSheet, patchedOf, pickAncestry, present } from '../../testing/sheet-page-harness';

describe('CharacterSheetPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('shows identity, build, attributes, defences, statistics, skills, languages, choices, spellcasting, class features, inventory and downtime in that order, each a region under a level 2 heading', async () => {
    const { root } = await openSheet();

    const regions = [...root.querySelectorAll('section')].map((region) => {
      const heading = present(region.querySelector('h2'));
      return [heading.textContent.trim(), region.getAttribute('aria-labelledby') === heading.id];
    });
    expect(regions).toStrictEqual([
      ['Identity', true],
      ['Build', true],
      ['Attributes', true],
      ['Defences', true],
      ['Statistics', true],
      ['Skills', true],
      ['Languages', true],
      ['Choices', true],
      ['Spellcasting', true],
      ['Class features', true],
      ['Inventory', true],
      ['Downtime', true],
    ]);
  });

  it('indexes every section with a skip link that moves focus to its heading', async () => {
    const { root } = await openSheet();
    const nav = present(root.querySelector('nav[aria-label="Sheet sections"]'));
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((link) => link.textContent.trim())).toStrictEqual([
      'Identity',
      'Build',
      'Attributes',
      'Defences',
      'Statistics',
      'Skills',
      'Languages',
      'Choices',
      'Spellcasting',
      'Class features',
      'Inventory',
      'Downtime',
    ]);

    links[2]?.click();

    expect(document.activeElement?.textContent.trim()).toBe('Attributes');
    expect(document.activeElement?.tagName).toBe('H2');
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

  it('edits only the chosen inputs inline: name, ancestry, heritage, background, level and class', async () => {
    const { root } = await openSheet();
    // The inventory's item and coin edits are its own (inventory-section spec).
    const labels = [...root.querySelectorAll('section:not([aria-labelledby="sheet-inventory"]) fr-inline-field')].map(
      (field) => present(field.querySelector('fr-text')).textContent.trim(),
    );
    expect(labels).toStrictEqual(['Name', 'Ancestry', 'Heritage', 'Background', 'Level', 'Class']);
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
      await TestBed.inject(ApplicationRef).whenStable();
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
      await TestBed.inject(ApplicationRef).whenStable();
      expect(field.textContent).toContain('That option is not available for this choice at any level.');
    });
  });

  it('shows the defences the engine derives, each list empty until rule elements are in play', async () => {
    const { root } = await openSheet();
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

  it('lists AC, saves and Perception from the engine, each opening its breakdown in place', async () => {
    const { root } = await openSheet();
    const statistics = present(root.querySelector('section[aria-labelledby="sheet-statistics"]'));

    await vi.waitFor(() => {
      expect(
        [...statistics.querySelectorAll('summary')].map((summary) =>
          summary.textContent.replaceAll(/\s+/gu, ' ').trim(),
        ),
      ).toStrictEqual(['Armor Class 12', 'Fortitude +1', 'Reflex +2', 'Will +1', 'Perception +1']);
    });
    const ac = present(statistics.querySelector('pio-breakdown'));
    expect(ac.textContent).toContain('Base 12');
    expect(ac.textContent).toContain('No modifiers.');
  });
});
