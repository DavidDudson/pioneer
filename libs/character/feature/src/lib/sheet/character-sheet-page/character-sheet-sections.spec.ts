import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import { render, settle, textOf } from '../../testing/sheet-tabs-testing';
import { SHEET_TAB_SECTIONS } from '../sheet-sections';

/** Each tab's first section, which its own address opens, and the path it opens at. */
const FIRST_SECTIONS: readonly (readonly [SheetMode, string, string])[] = [
  [SheetMode.Plan, 'identity', 'Identity'],
  [SheetMode.Encounter, 'defences', 'Defences'],
  [SheetMode.Exploration, 'roleplay', 'Appearance and personality'],
  [SheetMode.Downtime, 'rest', 'Rest and preparations'],
];

/** The headings of the sections in view: those of the tab's regions that are not concealed. */
function shownHeadings(root: HTMLElement): string[] {
  return [...root.querySelectorAll('router-outlet ~ * section')]
    .filter((region) => !region.classList.contains('hidden') && !region.closest('.hidden'))
    .map((region) => textOf(region.querySelector('h2')));
}

describe('CharacterSheetPage sections', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it.each(FIRST_SECTIONS)('opens the %s tab on its first section, %s', async (mode, path, heading) => {
    const { root } = await openSheet(undefined, { tab: mode });

    await vi.waitFor(() => {
      render();
      expect(TestBed.inject(Router).url).toBe(`/characters/${id}/${mode}/${path}`);
    });
    expect(shownHeadings(root)).toContain(heading);
  });

  it('has a tab for each section, in the segmented look, centred, the open one marked', async () => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Exploration });
    const nav = await vi.waitFor(() => present(root.querySelector('nav[aria-label="Sheet sections"]')));
    const links = [...nav.querySelectorAll('a')];

    expect(links.map((link) => textOf(link))).toStrictEqual([
      'Appearance and personality',
      'Exploration activity',
      'Actions',
      'Deity',
      'Languages',
      'Inventory',
    ]);
    expect(links).toHaveLength(SHEET_TAB_SECTIONS[SheetMode.Exploration].length);
    expect(links.map((link) => link.hasAttribute('aria-current'))).toStrictEqual([
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(present(nav.firstElementChild).className).toContain('mx-auto');
    expect(present(links[0]).className).toContain('bg-accent-solid');
  });

  it('shows one section at a time, each its own address, and keeps the others rendered', async () => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Exploration });
    const nav = await vi.waitFor(() => present(root.querySelector('nav[aria-label="Sheet sections"]')));
    const router = TestBed.inject(Router);
    expect(shownHeadings(root)).toStrictEqual(['Appearance and personality']);

    present([...nav.querySelectorAll('a')].find((link) => textOf(link) === 'Languages')).click();
    await settle();

    expect(router.url).toBe(`/characters/${id}/exploration/languages`);
    expect(shownHeadings(root)).toStrictEqual(['Languages']);
    expect(root.querySelectorAll('router-outlet ~ * section')).toHaveLength(6);
  });

  it('falls back to the first section for one the tab has no section by', async () => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Exploration });
    await TestBed.inject(Router).navigateByUrl(`/characters/${id}/exploration/nowhere`);
    await settle();

    expect(shownHeadings(root)).toStrictEqual(['Appearance and personality']);
  });
});
