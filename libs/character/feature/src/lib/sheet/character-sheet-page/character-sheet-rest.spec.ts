import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const PLAY_URL = `/api/characters/${id}/play`;

const PACKS = cutTo(FEAT_CONTENT_KINDS);

const BARD = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('bard') }, spellAccess: [] },
};

/** The play state of a hurt character with hero points `heroSpent` spent. */
function playOf(damage: number, heroSpent: number, revision = 1): object {
  return { revision, play: { hp: { damage, temp: 0 }, resources: { 'hero-points': heroSpent } } };
}

function restOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-rest'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...restOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage rest actions', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers each action without running any of them', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(5, 0), packs: PACKS });

    await vi.waitFor(() => {
      expect([...restOf(root).querySelectorAll('button')].map((button) => textOf(button))).toStrictEqual([
        'Rest',
        'Daily preparations',
        'Refocus',
        'Start of session',
      ]);
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('previews what Rest restores, then applies it as one command when confirmed', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(5, 0), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Rest').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toMatch(/Rest restores:\s*\d+ Hit Points?/u);
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });

    buttonOf(root, 'Confirm').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'rest' } });
      request.flush(playOf(4, 0, 2));
    });
    await vi.waitFor(() => {
      expect(restOf(root).textContent).not.toContain('Rest restores');
    });
  });

  it('previews the hero points a start of session sets, and can be cancelled', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(0, 3), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Start of session').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toContain('Hero Points from 0 to 1');
    });
    buttonOf(root, 'Cancel').click();
    await vi.waitFor(() => {
      expect(textOf(restOf(root))).not.toContain('Hero Points from');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('says so when an action has nothing to restore', async () => {
    const { root } = await openSheet(BARD, { tab: SheetMode.Downtime, play: playOf(0, 0), packs: PACKS });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Refocus').click();

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toContain('Nothing to restore.');
    });
  });

  it("lists a wand's cast and overcharge among what daily preparations gives back", async () => {
    const wand = '66666666-6666-4666-8666-666666666666';
    const bardWithWand = {
      ...BARD,
      inventory: {
        items: [{ id: wand, item: itemFixtureId(ItemFixture.FireballWand), quantity: 1 }],
        coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
      },
    };
    const spent = {
      revision: 1,
      play: {
        hp: { damage: 0, temp: 0 },
        resources: { uses: { [`wand:${wand}`]: 1, [`wand:${wand}:overcharge`]: 1 } },
      },
    };
    const { root } = await openSheet(bardWithWand, {
      tab: SheetMode.Downtime,
      play: spent,
      packs: [...PACKS, ITEM_FIXTURE_FILES],
    });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Daily preparations').click();

    await vi.waitFor(() => {
      const text = textOf(restOf(root));
      expect(text).toContain('1 use of Fireball-wand');
      expect(text).toContain('1 overcharged use of Fireball-wand');
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('prepares a staff at daily preparations, previewing its charges before they apply', async () => {
    const staff = '55555555-5555-4555-8555-555555555555';
    const bardWithStaff = {
      ...BARD,
      inventory: {
        items: [{ id: staff, item: itemFixtureId(ItemFixture.FireStaff), quantity: 1 }],
        coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
      },
    };
    const { harness, root } = await openSheet(bardWithStaff, {
      tab: SheetMode.Downtime,
      play: playOf(0, 0),
      packs: [...PACKS, ITEM_FIXTURE_FILES],
    });
    await vi.waitFor(() => {
      expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
    });

    buttonOf(root, 'Daily preparations').click();
    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toContain('No staff');
    });
    expect(textOf(restOf(root))).not.toMatch(/gets \d+ charges?/u);

    pickRow(harness, restOf(root), { matches: (label) => label !== 'No staff' });

    await vi.waitFor(() => {
      expect(textOf(restOf(root))).toMatch(/gets 1 charge/u);
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });

    buttonOf(root, 'Confirm').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'dailyPreparations', staff },
      });
      request.flush(playOf(0, 0, 2));
    });
  });

  describe('changing prepared spells', () => {
    const WIZARD = {
      ...MERISIEL,
      build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('wizard') }, spellAccess: [] },
    };
    const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

    async function openPreparations(): Promise<HTMLElement> {
      const { root } = await openSheet(WIZARD, { tab: SheetMode.Downtime, play: playOf(0, 0), packs: SPELL_PACKS });
      await vi.waitFor(() => {
        expect(restOf(root).querySelectorAll('button')).toHaveLength(4);
      });
      buttonOf(root, 'Daily preparations').click();
      await vi.waitFor(() => {
        expect(textOf(restOf(root))).toContain('Cantrips, cast at 1st rank');
      });
      return root;
    }

    it('offers Change per rank of a prepared entry, with no slot open to pick in at first', async () => {
      const root = await openPreparations();

      expect(textOf(restOf(root))).toContain('1st rank');
      expect([...restOf(root).querySelectorAll('button')].filter((button) => textOf(button) === 'Change')).toHaveLength(
        2,
      );
      expect(restOf(root).querySelectorAll('pio-spell-picker')).toHaveLength(0);
    });

    it('opens a picker for each slot of the rank when its Change is pressed, and closes them on Done', async () => {
      const root = await openPreparations();
      const change = present(
        [...restOf(root).querySelectorAll('button')].findLast((button) => textOf(button) === 'Change'),
      );

      change.click();
      await vi.waitFor(() => {
        expect(restOf(root).querySelectorAll('pio-spell-picker')).toHaveLength(2);
      });
      expect(textOf(restOf(root))).toContain('1st rank slot 1');

      buttonOf(root, 'Done').click();
      await vi.waitFor(() => {
        expect(restOf(root).querySelectorAll('pio-spell-picker')).toHaveLength(0);
      });
    });

    it('applies daily preparations without a prepared change when no spell is changed', async () => {
      const root = await openPreparations();

      buttonOf(root, 'Confirm').click();

      await vi.waitFor(() => {
        const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
        expect(request.request.body).toStrictEqual({ expectedRevision: 1, command: { field: 'dailyPreparations' } });
        request.flush(playOf(0, 0, 2));
      });
    });
  });
});
