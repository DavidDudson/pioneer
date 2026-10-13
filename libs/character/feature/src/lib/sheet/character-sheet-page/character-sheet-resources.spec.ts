import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { render, textOf } from '../../testing/sheet-tabs-testing';
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

function resourcesOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-resources'));
}

function buttonOf(root: HTMLElement, name: string, row = 0): HTMLButtonElement {
  const rows = [...resourcesOf(root).querySelectorAll<HTMLElement>('fr-stack fr-stack')];
  return present([...present(rows[row]).querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage hero and focus points', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], SPELL_PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows hero points held out of 3, and no focus points without a focus spell', async () => {
    const { root } = await openSheet(as('cleric'), { play: spentOf({ 'hero-points': 2 }), packs: SPELL_PACKS });

    await vi.waitFor(() => {
      const text = textOf(resourcesOf(root));
      expect(text).toContain('Hero Points');
      expect(text).toContain('1 of 3');
      expect(text).not.toContain('Focus Points');
    });
    const meter = present(resourcesOf(root).querySelector('meter'));
    expect([meter.value, meter.max]).toStrictEqual([1, 3]);
  });

  it("shows a bard's focus pool of 1 beside the hero points", async () => {
    const { root } = await openSheet(as('bard'), { play: spentOf({ 'focus-points': 1 }), packs: SPELL_PACKS });

    await vi.waitFor(() => {
      const text = textOf(resourcesOf(root));
      expect(text).toContain('Hero Points');
      expect(text).toContain('3 of 3');
      expect(text).toContain('Focus Points');
      expect(text).toContain('0 of 1');
    });
  });

  it('spends a hero point at the revision last read, and shows what the server answers', async () => {
    const { root } = await openSheet(as('cleric'), { play: spentOf({}), packs: SPELL_PACKS });
    await vi.waitFor(() => {
      expect(textOf(resourcesOf(root))).toContain('3 of 3');
    });

    buttonOf(root, 'Spend').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'spendResource', resource: 'hero-points', amount: 1 },
      });
      request.flush(spentOf({ 'hero-points': 1 }, 2));
    });
    await vi.waitFor(() => {
      expect(textOf(resourcesOf(root))).toContain('2 of 3');
    });
  });

  it('regains a point, and has nothing to regain at the maximum or to spend at 0', async () => {
    const { root } = await openSheet(as('cleric'), { play: spentOf({ 'hero-points': 3 }), packs: SPELL_PACKS });
    await vi.waitFor(() => {
      expect(textOf(resourcesOf(root))).toContain('0 of 3');
    });
    expect(buttonOf(root, 'Spend').disabled).toBe(true);

    buttonOf(root, 'Regain').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ command: { field: 'regainResource', resource: 'hero-points' } });
      request.flush(spentOf({ 'hero-points': 2 }, 2));
    });
    render();
    await vi.waitFor(() => {
      expect(textOf(resourcesOf(root))).toContain('1 of 3');
    });
    expect(buttonOf(root, 'Spend').disabled).toBe(false);
  });
});
