import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { render } from '../../testing/sheet-tabs-testing';
import { TEST_PACKS } from '../../testing/test-packs';

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
    const { root } = await openSheet(
      { ...MERISIEL, build: { choices: { ...MERISIEL.build.choices, ...choices } } },
      { tab: SheetMode.Encounter },
    );

    // A finesse fist: Dexterity +2 over Strength, and trained +3 at 1st level as the favoured weapon.
    await vi.waitFor(() => {
      const rows = [...strikesSection(root).querySelectorAll('[frDisclosureSummary]')];
      expect(rows.map((row) => textOf(row))).toStrictEqual(['Fist +5']);
    });

    // Its damage is a die, 1d4 bludgeoning, and an agile fist's later attacks take -4 and -8.
    const text = textOf(strikesSection(root));
    expect(text).toMatch(/1d4(?<bonus>[+−-]\d)? bludgeoning/u);
    expect(text).toContain('Multiple attack penalty -4 / -8');
  });

  it('says there are none without a held weapon or a fist', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter });

    await vi.waitFor(() => {
      expect(textOf(strikesSection(root))).toContain('No Strikes listed yet. Hold a weapon to add its Strike.');
    });
  });
});

const BLADE = '77777777-7777-4777-8777-777777777777';
const PACKS = [...TEST_PACKS, ITEM_FIXTURE_FILES];

/** Merisiel holding a sword whose Strikes gain +2 against undead. */
const SWORDSWOMAN = {
  ...MERISIEL,
  inventory: {
    items: [
      {
        id: BLADE,
        item: itemFixtureId(ItemFixture.HuntersBlade),
        quantity: 1,
        carry: { state: 'held', hands: 1 },
      },
    ],
    coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
  },
};

/** The first Strike's attack bonus as its row lists it, "Hunter's Blade +7" giving 7; throws until it is listed. */
function attackBonus(root: HTMLElement): number {
  const row = present(strikesSection(root).querySelector('[frDisclosureSummary]'));
  const match = /(?<sign>[+−-])(?<value>\d+)/u.exec(textOf(row));
  const value = Number(match?.groups?.['value']);
  return match?.groups?.['sign'] === '+' ? value : -value;
}

async function undeadToggle(root: HTMLElement): Promise<HTMLButtonElement> {
  return vi.waitFor(() =>
    present(
      [...strikesSection(root).querySelectorAll<HTMLButtonElement>('pio-statistic-conditions button')].find((button) =>
        textOf(button).includes('when the target is undead'),
      ),
    ),
  );
}

describe('CharacterSheetPage Strike conditional lines', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("counts a claimed line in a held weapon's attack, and leaves the total as it was when let go", async () => {
    const { root } = await openSheet(SWORDSWOMAN, { tab: SheetMode.Encounter, packs: PACKS });
    const before = await vi.waitFor(() => attackBonus(root));

    const claim = await undeadToggle(root);
    claim.click();
    render();
    await vi.waitFor(() => {
      expect(attackBonus(root)).toBe(before + 2);
    });

    const release = await undeadToggle(root);
    release.click();
    render();
    await vi.waitFor(() => {
      expect(attackBonus(root)).toBe(before);
    });
  });
});
