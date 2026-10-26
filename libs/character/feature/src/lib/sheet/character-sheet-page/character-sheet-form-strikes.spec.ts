import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

/** Player Core's character kinds and the effects of Divine Mysteries, with the fixture items. */
const PACKS = [...cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Effect]), ITEM_FIXTURE_FILES];

const PLANT_FORM = '364d6d32-3a80-511d-95b1-952f32748076';
const HUMANOID_FORM = '2637bb3d-7377-5209-bc2c-97995c254a45';
const BLADE = '77777777-7777-4777-8777-777777777777';
const FIRST = '00000000-0000-4000-8000-000000000001';

/** Merisiel holding a Hunter's Blade. */
const SWORDSWOMAN = {
  ...MERISIEL,
  inventory: {
    items: [
      {
        id: BLADE,
        item: itemFixtureId(ItemFixture.HuntersBlade),
        quantity: 1,
        carry: { state: 'held', hands: 1 },
      },
    ],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

function inForm(effect: string, form: string, rank: number): object {
  const effects = [{ id: FIRST, effect, source: { kind: 'self' }, form, rank }];
  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, effects } };
}

const plant = inForm(PLANT_FORM, 'plant-form:flytrap', 6);
const humanoid = inForm(HUMANOID_FORM, 'humanoid-form:large', 5);

function strikesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-strikes"]'));
}

/** The Strikes listed, each row's summary. */
function rowsOf(root: HTMLElement): string[] {
  return [...strikesSection(root).querySelectorAll('[frDisclosureSummary]')].map((row) => textOf(row));
}

describe('CharacterSheetPage Strikes in a form', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("lists the form's Strikes in place of the held weapon, and says where the weapon went", async () => {
    const { root } = await openSheet(SWORDSWOMAN, { tab: SheetMode.Encounter, play: plant, packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(strikesSection(root))).toContain('Replaced by your form: Hunter');
    });
    expect(rowsOf(root).some((row) => row.includes('Hunter'))).toBe(false);
    expect(rowsOf(root).length).toBeGreaterThan(0);
  });

  it('lists the held weapon again in the base view, with nothing replaced', async () => {
    const { root } = await openSheet(SWORDSWOMAN, { tab: SheetMode.Encounter, play: plant, packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(strikesSection(root))).toContain('Replaced by your form');
    });

    const toggle = present(
      [...root.querySelectorAll<HTMLButtonElement>('pio-sheet-form button')].find(
        (button) => textOf(button) === 'Show base sheet',
      ),
    );
    toggle.click();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(textOf(strikesSection(root))).not.toContain('Replaced by your form');
    expect(rowsOf(root).some((row) => row.includes('Hunter'))).toBe(true);
  });

  it('keeps the held weapon in a form that is no battle form', async () => {
    const { root } = await openSheet(SWORDSWOMAN, { tab: SheetMode.Encounter, play: humanoid, packs: PACKS });

    await vi.waitFor(() => {
      expect(rowsOf(root).some((row) => row.includes('Hunter'))).toBe(true);
    });
    expect(textOf(strikesSection(root))).not.toContain('Replaced by your form');
  });
});
