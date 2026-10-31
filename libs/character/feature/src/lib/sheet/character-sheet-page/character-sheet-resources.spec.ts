import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its spells, for the focus pool a bard's composition spells give. */
const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Merisiel as a `name`: a cleric has no focus spells at level 1, a bard has the composition cantrip and a spell. */
function as(name: 'bard' | 'cleric'): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name) }, spellAccess: [] },
  };
}

/** The play state of a full-health character with `spent` points spent from the pools. */
function spentOf(spent: object, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, resources: spent } };
}

/** The text of every pool shown: the header's focus points and the rail's hero points. */
function resourcesText(root: HTMLElement): string {
  return [...root.querySelectorAll<HTMLElement>('pio-sheet-resources')].map((each) => textOf(each)).join(' ');
}

/** The pips of the group named `group`, in order. */
function pipsOf(root: HTMLElement, group: string): HTMLButtonElement[] {
  const toolbar = present(
    [...root.querySelectorAll('pio-sheet-resources [role="toolbar"]')].find(
      (each) => each.getAttribute('aria-label') === group,
    ),
  );
  return [...toolbar.querySelectorAll('button')];
}

/** Which pips are filled, as 1 and 0. */
function filled(pips: readonly HTMLButtonElement[]): string {
  return pips.map((pip) => (pip.getAttribute('aria-pressed') === 'true' ? '1' : '0')).join('');
}

describe('CharacterSheetPage hero and focus points', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], SPELL_PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows hero points held as filled pips out of 3, and no focus points without a focus spell', async () => {
    const { root } = await openSheet(as('cleric'), {
      tab: SheetMode.Encounter,
      play: spentOf({ 'hero-points': 2 }),
      packs: SPELL_PACKS,
    });

    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('100');
    });
    expect(resourcesText(root)).not.toContain('Focus Points');
  });

  it("shows a bard's focus pool of 1 beside the hero points", async () => {
    const { root } = await openSheet(as('bard'), {
      tab: SheetMode.Encounter,
      play: spentOf({ 'focus-points': 1 }),
      packs: SPELL_PACKS,
    });

    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('111');
      expect(filled(pipsOf(root, 'Focus Points'))).toBe('0');
    });
  });

  it('spends a hero point by pressing the last filled pip, at the revision last read', async () => {
    const { root } = await openSheet(as('cleric'), { tab: SheetMode.Encounter, play: spentOf({}), packs: SPELL_PACKS });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('111');
    });

    present(pipsOf(root, 'Hero Points')[2]).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'spendResource', resource: 'hero-points', amount: 1 },
      });
      request.flush(spentOf({ 'hero-points': 1 }, 2));
    });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('110');
    });
  });

  it('regains a point by pressing the next empty pip', async () => {
    const { root } = await openSheet(as('cleric'), {
      tab: SheetMode.Encounter,
      play: spentOf({ 'hero-points': 3 }),
      packs: SPELL_PACKS,
    });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('000');
    });

    present(pipsOf(root, 'Hero Points')[0]).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ command: { field: 'regainResource', resource: 'hero-points' } });
      request.flush(spentOf({ 'hero-points': 2 }, 2));
    });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('100');
    });
  });

  it('sets the points when a press jumps more than one pip', async () => {
    const { root } = await openSheet(as('cleric'), {
      tab: SheetMode.Encounter,
      play: spentOf({ 'hero-points': 3 }),
      packs: SPELL_PACKS,
    });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('000');
    });

    present(pipsOf(root, 'Hero Points')[2]).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'setResource', resource: 'hero-points', current: 3 },
      });
      request.flush(spentOf({}, 2));
    });
  });

  it('puts the pips back when the server refuses the press', async () => {
    const { root } = await openSheet(as('cleric'), { tab: SheetMode.Encounter, play: spentOf({}), packs: SPELL_PACKS });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('111');
    });

    present(pipsOf(root, 'Hero Points')[2]).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      request.flush({ title: 'Conflict' }, { status: 409, statusText: 'Conflict' });
    });
    await vi.waitFor(() => {
      expect(filled(pipsOf(root, 'Hero Points'))).toBe('111');
    });
  });
});
