import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';

/** Irori, whose favoured weapon is the fist. */
const IRORI = contentId(PackId.parse('divine-mysteries'), EntrySlug.parse('deity:irori'));

function strikesSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-strikes"]'));
}

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe('CharacterSheetPage Strikes', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it("lists a fist for a cleric of Irori, trained in it as the deity's favoured weapon", async () => {
    const choices = { class: playerCoreClassId('cleric'), 'boost:1:class:0': 'wis', deity: IRORI };
    const { root } = await openSheet({ ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, ...choices } } });

    // A finesse fist: Dexterity +2 over Strength, and trained +3 at 1st level as the favoured weapon.
    await vi.waitFor(() => {
      const rows = [...strikesSection(root).querySelectorAll('[frDisclosureSummary]')];
      expect(rows.map((row) => textOf(row))).toStrictEqual(['Fist +5']);
    });
  });

  it('says there are none without a held weapon or a fist', async () => {
    const { root } = await openSheet();

    await vi.waitFor(() => {
      expect(textOf(strikesSection(root))).toContain('No Strikes listed yet. Hold a weapon to add its Strike.');
    });
  });
});
