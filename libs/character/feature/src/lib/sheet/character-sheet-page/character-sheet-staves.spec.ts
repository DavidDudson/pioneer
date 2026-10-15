import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

/** Player Core with its spells, and the fixture items among them the fire staff. */
const PACKS = [...cutTo(SPELL_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const STAFF = '55555555-5555-4555-8555-555555555555';

/** A 1st-level wizard (arcane, 1st-rank slots) carrying the fire staff as `carry`. */
function wizardWith(carry: object): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('wizard') }, spellAccess: [] },
    inventory: {
      items: [{ id: STAFF, item: itemFixtureId(ItemFixture.FireStaff), quantity: 1, carry }],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

const HELD = { state: 'held', hands: 1 };

function textOf(element: Element): string {
  return element.textContent.replaceAll(/\s+/gu, ' ').trim();
}

/** The staff's section once its spells load, past the empty host shown until they do. */
async function stavesOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-staff-spells')));
}

describe('CharacterSheetPage staff spells', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("lists a held staff's spells with their charge cost and the charges it has left", async () => {
    const play = {
      revision: 1,
      play: { hp: { damage: 0, temp: 0 }, resources: { staff: { [STAFF]: { max: 4, spent: 1 } } } },
    };
    const { root } = await openSheet(wizardWith(HELD), { play, packs: PACKS });
    const staves = await stavesOf(root);

    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('3 of 4 charges');
    });
    expect(textOf(staves)).toContain('Cantrip, no charges');
    expect(textOf(staves)).toContain('1 charge');
    expect(textOf(staves)).toContain('3 charges');
  });

  it('shows a spell the holder cannot cast as unavailable, with the reason', async () => {
    const { root } = await openSheet(wizardWith(HELD), { packs: PACKS });
    const staves = await stavesOf(root);

    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('You cast no spell of 3rd rank yet');
    });
    expect(textOf(staves)).toContain('Not prepared today');
  });

  it('shows no section for a staff that is stowed', async () => {
    const { root } = await openSheet(wizardWith({ state: 'stowed' }), { packs: PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(root.querySelector('pio-staff-spells')).toBeNull();
  });
});
