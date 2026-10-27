import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  playerCoreClassId,
  playerCoreId,
} from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickAncestry } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { HUMAN, id, MERISIEL, NO_TAB, openSheet, patchedOf, present } from '../../testing/sheet-page-harness';
import { render, textOf } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const SHEET_MODE_URL = `/api/characters/${id}/sheet-mode`;
const CLERIC = playerCoreClassId('cleric');
const DOCTRINE = `${playerCoreId(ContentKind.ClassFeature, 'doctrine')}:0`;
const WARPRIEST = playerCoreId(ContentKind.ClassFeature, 'warpriest');
const LEATHER = '55555555-5555-4555-8555-555555555555';
/** The official packs, with the item fixtures for her armour. */
const HEADER_PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];

/** Merisiel as a warpriest cleric, in worn leather armour. */
const WARPRIEST_MERISIEL = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: CLERIC, [DOCTRINE]: WARPRIEST } },
  inventory: {
    items: [{ id: LEATHER, item: itemFixtureId(ItemFixture.LeatherArmor), quantity: 1, carry: { state: 'worn' } }],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

/** The slots the server read for her: an elf, a cleric, a warpriest. */
const WARPRIEST_SLOTS = [
  {
    status: 'filled',
    key: 'ancestry',
    subject: { kind: 'root', content: 'ancestry' },
    selection: MERISIEL.build.choices.ancestry,
    selectionName: 'Elf',
  },
  {
    status: 'filled',
    key: 'class',
    subject: { kind: 'root', content: 'class' },
    selection: CLERIC,
    selectionName: 'Cleric',
  },
  {
    status: 'filled',
    key: DOCTRINE,
    subject: { kind: 'choice', entry: playerCoreId(ContentKind.ClassFeature, 'doctrine'), entryName: 'Doctrine' },
    selection: WARPRIEST,
    selectionName: 'Warpriest',
  },
];

describe('CharacterSheetPage header', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], HEADER_PACKS);
  }, PREBUILD_TIMEOUT);

  it('names the level, ancestry, class and subclass in the identity line', async () => {
    const { root } = await openSheet(WARPRIEST_MERISIEL, { slots: WARPRIEST_SLOTS, packs: HEADER_PACKS });

    await vi.waitFor(() => {
      expect(root.textContent).toContain('Level 1 Elf Cleric, Warpriest');
    });
  });

  it('offers to report a bug with this character attached', async () => {
    const { root } = await openSheet(WARPRIEST_MERISIEL, { slots: WARPRIEST_SLOTS, packs: HEADER_PACKS });

    const link = await vi.waitFor(() => present(root.querySelector<HTMLAnchorElement>('pio-sheet-report-bug a')));
    const target = new URL(link.href);
    expect(target.pathname).toBe('/account/report-bug');
    expect(target.searchParams.get('character')).toBe(id);
    expect(target.searchParams.get('name')).toBe(WARPRIEST_MERISIEL.name);
    expect(textOf(link)).toBe('Report a bug');
  });

  it('shows the ranks the class gives, and the armour that sets AC', async () => {
    const { root } = await openSheet(WARPRIEST_MERISIEL, { slots: WARPRIEST_SLOTS, packs: HEADER_PACKS });
    const vitalsNow = (): HTMLElement => present(root.querySelector<HTMLElement>('pio-vitals'));

    await vi.waitFor(() => {
      // The tiles' own ranks, not the empty ones the rows inside them hold for a skill's.
      const tileRanks = [...vitalsNow().querySelectorAll('pio-proficiency-rank')].filter(
        (rank) => rank.closest('summary') === null,
      );
      expect(tileRanks.map((rank) => textOf(rank))).toStrictEqual([
        'TTrained',
        'TTrained',
        'TTrained',
        'EExpert',
        'TTrained',
        'TTrained',
      ]);
    });
    // The item fixtures name their entries after their slugs.
    const vitals = vitalsNow();
    expect(vitals.textContent).toContain('Leather-armor');
    expect(vitals.textContent).not.toContain('Unarmored');
  });

  it('opens Plan at its own address when no tab is remembered', async () => {
    await openSheet(MERISIEL, { tab: NO_TAB });

    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController).expectOne(SHEET_MODE_URL).flush({});
    });
    await vi.waitFor(() => {
      render();
      expect(TestBed.inject(Router).url).toBe(`/characters/${id}/plan`);
    });
  });

  it('says another version is showing after a conflict, and offers no Retry', async () => {
    const { root } = await openSheet();
    const status = present(root.querySelector('pio-sheet-save-status'));
    await pickAncestry(root, 'Human');
    const http = TestBed.inject(HttpTestingController);

    const request = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: `/api/characters/${id}` }));
    expect(request.request.body).toMatchObject({ patch: { selection: HUMAN } });
    request.flush(
      { type: 'conflict', title: 'Conflict', status: 409, message: { key: 'problem.versionConflict' } },
      { status: 409, statusText: 'Conflict' },
    );
    // The store reads the other version back before the edit settles.
    await vi.waitFor(() => {
      http
        .expectOne({ method: 'GET', url: `/api/characters/${id}` })
        .flush(patchedOf({ ...MERISIEL, version: 2, name: 'Merisiel Silverleaf' }, []));
    });
    await vi.waitFor(() => {
      render();
      expect(textOf(status)).toBe('Someone else changed this character. Showing their latest version.');
    });
    expect(status.querySelector('button')).toBeNull();
  });
});
