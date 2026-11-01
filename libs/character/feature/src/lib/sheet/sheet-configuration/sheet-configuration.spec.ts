import { SheetMode } from '@pioneer/character/domain';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { openSheet } from '../../testing/sheet-page-harness';
import { openConfiguration, render, textOf } from '../../testing/sheet-tabs-testing';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import type { SheetSection } from '../sheet-sections';

const CONFIGURATION: ReadonlySet<SheetSection> = new Set([
  SHEET_SECTIONS.packs,
  SHEET_SECTIONS.variantRules,
  SHEET_SECTIONS.ruleLimits,
  SHEET_SECTIONS.overrides,
  SHEET_SECTIONS.customEffects,
]);

describe('character configuration', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('is no section of any sheet tab', () => {
    const tabbed = Object.values(SHEET_TAB_SECTIONS).flat();

    expect(tabbed.filter((section) => CONFIGURATION.has(section))).toStrictEqual([]);
  });

  it('closes the actions menu once it opens', async () => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Plan });
    await openConfiguration(root);

    await vi.waitFor(() => {
      render();
      expect(document.querySelector('[role="group"][aria-label="Sheet actions"]')).toBeNull();
    });
  });

  it('opens from the actions menu as a drawer holding the packs, variant rules, limits, overrides and custom effects', async () => {
    const { root } = await openSheet(undefined, { tab: SheetMode.Plan });
    await openConfiguration(root);

    await vi.waitFor(() => {
      render();
      const headings = [...document.querySelectorAll('h2')].map((heading) => textOf(heading));
      expect(headings).toStrictEqual(
        expect.arrayContaining(['Content packs', 'Variant rules', 'Table limits', 'Overrides', 'Custom effects']),
      );
    });
  });
});
