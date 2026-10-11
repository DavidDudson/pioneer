import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, PackId, Slug } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../../character.routes';
import { provideServerStateTesting } from '../../testing/provide-server-state-testing';

const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

const MERISIEL = {
  id,
  version: 1,
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  name: 'Merisiel',
  build: { choices: { ancestry: contentId(PackId.parse('player-core'), Slug.parse('elf')) } },
  level: 1,
  attributes: { str: 0, dex: 4, con: 1, int: 0, wis: 0, cha: 1 },
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

function keydown(key: string): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
}

/** The attribute grid's value buttons, in order. */
function attributeButtons(root: HTMLElement): HTMLElement[] {
  const grid = present(root.querySelector<HTMLElement>('[role="toolbar"]'));
  return [...grid.querySelectorAll<HTMLElement>('fr-inline-field button')].filter(
    (button) => button.closest('fr-save-status') === null,
  );
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

  it('makes the attribute grid one Tab stop, with arrow keys between its values', async () => {
    const { root } = await openSheet();
    const buttons = attributeButtons(root);
    await vi.waitFor(() => {
      expect(buttons.map((button) => button.getAttribute('tabindex'))).toStrictEqual([
        '0',
        '-1',
        '-1',
        '-1',
        '-1',
        '-1',
      ]);
    });

    buttons[0]?.focus();
    buttons[0]?.dispatchEvent(keydown('ArrowRight'));

    expect(document.activeElement).toBe(buttons[1]);
  });

  it('names the attribute grid after its section', async () => {
    const { root } = await openSheet();
    expect(root.querySelector('[role="toolbar"]')?.getAttribute('aria-label')).toBe('Attributes');
  });

  it('edits only the chosen inputs inline: name, ancestry, level and attribute modifiers', async () => {
    const { root } = await openSheet();
    const labels = [...root.querySelectorAll('fr-inline-field')].map((field) =>
      present(field.querySelector('fr-text')).textContent.trim(),
    );
    expect(labels).toStrictEqual([
      'Name',
      'Ancestry',
      'Level',
      'Strength',
      'Dexterity',
      'Constitution',
      'Intelligence',
      'Wisdom',
      'Charisma',
    ]);
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
      ).toStrictEqual(['Armor Class 14', 'Fortitude +1', 'Reflex +4', 'Will +0', 'Perception +0']);
    });
    const ac = present(statistics.querySelector('pio-breakdown'));
    expect(ac.textContent).toContain('Base 14');
    expect(ac.textContent).toContain('No modifiers.');
  });
});
