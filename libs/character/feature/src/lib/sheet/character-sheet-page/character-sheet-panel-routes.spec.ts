import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { offeredLabels, pickerCount } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import { settle } from '../../testing/sheet-tabs-testing';
import { SHEET_TAB_SECTIONS } from '../sheet-sections';

const MODES = [SheetMode.Plan, SheetMode.Exploration, SheetMode.Downtime] as const;

/** Each side panel's path and the element its content renders. */
const PANELS = [
  ['skills', 'pio-skills'],
  ['conditions', 'pio-sheet-conditions'],
  ['environments', 'pio-sheet-environments'],
] as const;

const PANEL_LABELS = ['Skills', 'Conditions', 'Environments'];

/** The sections in view: those of the tab's regions that are not concealed. */
function shownSections(root: HTMLElement): Element[] {
  return [...root.querySelectorAll('router-outlet ~ * section')].filter(
    (region) => !region.classList.contains('hidden') && !region.closest('.hidden'),
  );
}

describe('CharacterSheetPage panel routes', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it.each(PANELS)('renders the %s panel as %s under the dropdown, and no other panel', async (path, content) => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Encounter });
    await TestBed.inject(Router).navigateByUrl(`/characters/${id}/encounter/${path}`);
    await settle();

    await vi.waitFor(() => {
      expect(root.querySelector(`pio-sheet-section-tabs pio-sheet-panel ${content}`)).not.toBeNull();
    });
    const others = PANELS.filter(([, each]) => each !== content).map(([, each]) => each);
    for (const other of others) {
      expect(root.querySelector(`pio-sheet-section-tabs pio-sheet-panel ${other}`)).toBeNull();
    }
  });

  it.each(MODES)('offers the %s sections, then the panels, in the dropdown', async (mode) => {
    const { harness, root } = await openSheet(undefined, { tab: mode });
    const tabs = (): HTMLElement => present(root.querySelector<HTMLElement>('pio-sheet-section-tabs'));
    await vi.waitFor(() => {
      expect(pickerCount(harness, tabs())).toBe(1);
    });

    const labels = offeredLabels(harness, tabs());

    expect(labels).toHaveLength(SHEET_TAB_SECTIONS[mode].length + PANEL_LABELS.length);
    expect(labels.slice(-PANEL_LABELS.length)).toStrictEqual(PANEL_LABELS);
  });

  it.each(MODES)('opens a panel on the %s tab at its own address, with no section shown', async (mode) => {
    const { root } = await openSheet(undefined, { tab: mode });
    await TestBed.inject(Router).navigateByUrl(`/characters/${id}/${mode}/conditions`);
    await settle();

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-section-tabs pio-sheet-panel pio-sheet-conditions')).not.toBeNull();
    });
    expect(shownSections(root)).toHaveLength(0);
  });
});
