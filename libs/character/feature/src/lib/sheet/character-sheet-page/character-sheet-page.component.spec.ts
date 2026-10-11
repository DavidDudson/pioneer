import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

const HUMAN = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human'));

const MERISIEL = {
  id,
  version: 1,
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  name: 'Merisiel',
  build: {
    choices: {
      ancestry: contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')),
      'boost:1:ancestry:2': 'con',
      'boost:1:free:0': 'dex',
      'boost:1:free:1': 'con',
      'boost:1:free:2': 'wis',
    },
  },
  level: 1,
  createdAt: '2026-10-07T10:00:00.000Z',
  updatedAt: '2026-10-07T10:00:00.000Z',
};

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

interface OpenSheet {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

/** Opens Merisiel's sheet in the document, so focus can move, and waits until she has loaded. */
async function openSheet(): Promise<OpenSheet> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/characters/${id}`);
  const host = harness.fixture.nativeElement as HTMLElement;
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController).expectOne(`/api/characters/${id}`).flush(MERISIEL);
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(async () => {
    // Through the application, not `harness.detectChanges()`, so render hooks (roving focus) run as in the app.
    await TestBed.inject(ApplicationRef).whenStable();
    expect(root.textContent).toContain('Merisiel');
  });
  return { harness, root };
}

/** Opens the ancestry field and picks the option whose label starts with `name`; returns the field. */
async function pickAncestry(root: HTMLElement, name: string): Promise<HTMLElement> {
  const field = present(
    [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim() === 'Ancestry',
    ),
  );
  present(field.querySelector<HTMLElement>('button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  present(field.querySelector<HTMLElement>('[frInlineEditor] button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  const option = await vi.waitFor(() =>
    present(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((each) =>
        each.textContent.trim().startsWith(name),
      ),
    ),
  );
  option.click();
  return field;
}

describe('CharacterSheetPage', () => {
  it('shows identity, attributes, defences and statistics in that order, each a region under a level 2 heading', async () => {
    const { root } = await openSheet();

    const regions = [...root.querySelectorAll('section')].map((region) => {
      const heading = present(region.querySelector('h2'));
      return [heading.textContent.trim(), region.getAttribute('aria-labelledby') === heading.id];
    });
    expect(regions).toStrictEqual([
      ['Identity', true],
      ['Attributes', true],
      ['Defences', true],
      ['Statistics', true],
    ]);
  });

  it('indexes every section with a skip link that moves focus to its heading', async () => {
    const { root } = await openSheet();
    const nav = present(root.querySelector('nav[aria-label="Sheet sections"]'));
    const links = [...nav.querySelectorAll('a')];
    expect(links.map((link) => link.textContent.trim())).toStrictEqual([
      'Identity',
      'Attributes',
      'Defences',
      'Statistics',
    ]);

    links[1]?.click();

    expect(document.activeElement?.textContent.trim()).toBe('Attributes');
    expect(document.activeElement?.tagName).toBe('H2');
  });

  it('shows the modifiers the boost picks give: the elf’s fixed boosts and flaw, then each pick', async () => {
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
        ['Intelligence', '+1'],
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

  it('edits only the chosen inputs inline: name, ancestry and level', async () => {
    const { root } = await openSheet();
    const labels = [...root.querySelectorAll('fr-inline-field')].map((field) =>
      present(field.querySelector('fr-text')).textContent.trim(),
    );
    expect(labels).toStrictEqual(['Name', 'Ancestry', 'Level']);
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
    request.flush({ ...MERISIEL, version: 2, build: { choices: { ancestry: HUMAN } } });
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
