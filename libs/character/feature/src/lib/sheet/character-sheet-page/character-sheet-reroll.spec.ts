import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import type { GenerateCharacterBody } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { render } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

const GENERATE_URL = '/api/characters/generate';
const REROLLED = '1b2c3d4e-5f60-4a7b-8c9d-0e1f2a3b4c5d';

/** The slots the server read for her: the ancestry, chosen. */
const SLOTS = [
  {
    status: 'filled',
    key: 'ancestry',
    subject: { kind: 'root', content: 'ancestry' },
    selection: MERISIEL.build.choices.ancestry,
    selectionName: 'Elf',
  },
];

/** What the server answers a re-roll with: a new character, and the seed that made it. */
const GENERATED = {
  seed: 7,
  character: {
    ...MERISIEL,
    id: REROLLED,
    createdAt: '2026-10-29T10:00:00.000Z',
    updatedAt: '2026-10-29T10:00:00.000Z',
  },
};

describe('CharacterSheetPage re-roll', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([], TEST_PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers a keep toggle on each chosen choice, off until pressed', async () => {
    const { root } = await openSheet(MERISIEL, { slots: SLOTS, packs: TEST_PACKS });

    const keep = await vi.waitFor(() =>
      present(root.querySelector<HTMLButtonElement>('pio-sheet-reroll fr-toggle-button button')),
    );
    expect(keep.getAttribute('aria-pressed')).toBe('false');
    keep.click();
    render();
    expect(keep.getAttribute('aria-pressed')).toBe('true');
  });

  it('re-rolls from the kept choices, and opens the new character', async () => {
    const { root } = await openSheet(MERISIEL, { slots: SLOTS, packs: TEST_PACKS });
    const keep = await vi.waitFor(() =>
      present(root.querySelector<HTMLButtonElement>('pio-sheet-reroll fr-toggle-button button')),
    );
    keep.click();
    render();

    present(root.querySelector<HTMLButtonElement>('pio-sheet-reroll fr-async-button button')).click();
    const http = TestBed.inject(HttpTestingController);
    const request = await vi.waitFor(() => http.expectOne({ method: 'POST', url: GENERATE_URL }));

    const { level, name, locks, seed, theme } = request.request.body as GenerateCharacterBody;
    expect([level, name, seed, theme]).toStrictEqual([1, MERISIEL.name, undefined, undefined]);
    expect(locks).toStrictEqual([{ slot: 'ancestry', selection: MERISIEL.build.choices.ancestry }]);
    request.flush(GENERATED);
    await vi.waitFor(() => {
      render();
      expect(TestBed.inject(Router).url).toContain(REROLLED);
    });
  });

  it('keeps nothing when no toggle was pressed', async () => {
    const { root } = await openSheet(MERISIEL, { slots: SLOTS, packs: TEST_PACKS });
    await vi.waitFor(() => present(root.querySelector('pio-sheet-reroll fr-toggle-button')));

    present(root.querySelector<HTMLButtonElement>('pio-sheet-reroll fr-async-button button')).click();
    const http = TestBed.inject(HttpTestingController);
    const request = await vi.waitFor(() => http.expectOne({ method: 'POST', url: GENERATE_URL }));

    expect((request.request.body as GenerateCharacterBody).locks).toStrictEqual([]);
  });
});
