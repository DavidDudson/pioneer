import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickAncestry } from '../../testing/origin-table-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { HUMAN, id, MERISIEL, NO_TAB, openSheet, patchedOf, present } from '../../testing/sheet-page-harness';
import { openTab, regionsOf, render, settle, textOf } from '../../testing/sheet-tabs-testing';

const SHEET_MODE_URL = `/api/characters/${id}/sheet-mode`;

describe('CharacterSheetPage modes', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('heads every tab with the name, a one-line identity, the save state and the vitals', async () => {
    const { root } = await openSheet();

    expect(textOf(root.querySelector('h1'))).toBe('Merisiel');
    await vi.waitFor(() => {
      expect(root.textContent).toContain('Level 1 Elf');
    });
    expect(textOf(root.querySelector('pio-sheet-save-status'))).toBe('All changes saved');
    await vi.waitFor(() => {
      expect(root.querySelectorAll('pio-vitals fr-surface pio-statistics')).toHaveLength(7);
    });

    await openTab(root, 'Downtime', 'Rest and preparations');
    expect(textOf(root.querySelector('h1'))).toBe('Merisiel');
    expect(root.querySelectorAll('pio-vitals fr-surface pio-statistics')).toHaveLength(7);
  });

  it('shows AC, saves and Perception in the vitals with their ranks, and what sets AC', async () => {
    const { root } = await openSheet();
    const vitalsOf = (): HTMLElement => present(root.querySelector('pio-vitals'));

    await vi.waitFor(() => {
      expect([...vitalsOf().querySelectorAll('summary')].map((summary) => textOf(summary))).toStrictEqual([
        'Armor Class 12',
        'Fortitude +1',
        'Reflex +2',
        'Will +1',
        'Perception +1',
        'Speed 30',
      ]);
    });
    // The tiles' own ranks, not the empty ones the rows inside them hold for a skill's.
    const tileRanks = [...vitalsOf().querySelectorAll('pio-proficiency-rank')].filter(
      (rank) => rank.closest('summary') === null,
    );
    expect(tileRanks.map((rank) => textOf(rank))).toStrictEqual(Array.from({ length: 6 }, () => 'UUntrained'));
    expect(vitalsOf().textContent).toContain('Unarmored');
    const ac = present(vitalsOf().querySelector('pio-breakdown'));
    expect(ac.textContent).toContain('Base 12');
  });

  it('switches between the four tabs, each its own address, marking the open one', async () => {
    const { root } = await openSheet();
    const nav = present(root.querySelector('nav[aria-label="Sheet mode"]'));
    const links = [...nav.querySelectorAll('a')];

    expect(links.map((link) => link.textContent.trim())).toStrictEqual([
      'Plan',
      'Encounter',
      'Exploration',
      'Downtime',
    ]);
    expect(links.map((link) => link.hasAttribute('aria-current'))).toStrictEqual([true, false, false, false]);

    await openTab(root, 'Encounter', 'Skills');
    expect(TestBed.inject(Router).url).toBe(`/characters/${id}/encounter/defences`);
    expect(links.map((link) => link.hasAttribute('aria-current'))).toStrictEqual([false, true, false, false]);
  });

  it('opens the tab last open on the character at its own address', async () => {
    const { root } = await openSheet(MERISIEL, { tab: NO_TAB });

    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController).expectOne(SHEET_MODE_URL).flush({ mode: SheetMode.Exploration });
    });
    await vi.waitFor(async () => {
      await settle();
      expect(TestBed.inject(Router).url).toBe(`/characters/${id}/exploration/roleplay`);
      expect(regionsOf(root)[0]?.[0]).toBe('Appearance and personality');
    });
  });

  it('opens Exploration at its own address when no tab is remembered, or the tab could not be read', async () => {
    await openSheet(MERISIEL, { tab: NO_TAB });

    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne(SHEET_MODE_URL)
        .flush({ title: 'Server error' }, { status: 500, statusText: 'Server Error' });
    });
    await vi.waitFor(() => {
      render();
      expect(TestBed.inject(Router).url).toBe(`/characters/${id}/exploration/roleplay`);
    });
  });

  it('remembers the tab switched to, once the one it had is known', async () => {
    const { root } = await openSheet();
    const http = TestBed.inject(HttpTestingController);
    await vi.waitFor(() => {
      http.expectOne(SHEET_MODE_URL).flush({ mode: SheetMode.Plan });
    });
    await settle();
    http.expectNone({ method: 'PATCH', url: SHEET_MODE_URL });

    await openTab(root, 'Encounter', 'Skills');

    const request = await vi.waitFor(() => http.expectOne({ method: 'PATCH', url: SHEET_MODE_URL }));
    expect(request.request.body).toStrictEqual({ mode: SheetMode.Encounter });
  });

  it('shows Saving while an edit is in flight, then that every change is saved', async () => {
    const { root } = await openSheet();
    const status = present(root.querySelector('pio-sheet-save-status'));
    await pickAncestry(root, 'Human');

    const request = await vi.waitFor(() =>
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
    );
    await settle();
    expect(textOf(status)).toBe('Saving');
    request.flush(patchedOf({ ...MERISIEL, version: 2, build: { choices: { ancestry: HUMAN } } }, []));
    await vi.waitFor(async () => {
      await settle();
      expect(textOf(status)).toBe('All changes saved');
    });
  });

  it('says when the last edit failed, and Retry sends it again', async () => {
    const { root } = await openSheet();
    const status = present(root.querySelector('pio-sheet-save-status'));
    await pickAncestry(root, 'Human');
    const http = TestBed.inject(HttpTestingController);
    const edit = { method: 'PATCH', url: `/api/characters/${id}` };

    const failed = await vi.waitFor(() => http.expectOne(edit));
    failed.flush({ title: 'Server error' }, { status: 500, statusText: 'Server Error' });
    await vi.waitFor(() => {
      render();
      expect(status.textContent).toContain('Could not save your last change.');
    });
    present([...status.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Retry')).click();

    const retried = await vi.waitFor(() => http.expectOne(edit));
    expect(retried.request.body).toStrictEqual(failed.request.body);
    retried.flush(patchedOf({ ...MERISIEL, version: 2, build: { choices: { ancestry: HUMAN } } }, []));
    await vi.waitFor(() => {
      render();
      expect(textOf(status)).toContain('All changes saved');
    });
  });
});
