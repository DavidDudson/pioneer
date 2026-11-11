import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { openActionKind, textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { ACTION_CONTENT_KINDS } from '../sheet-actions';

const PLAY_URL = `/api/characters/${id}/play`;

/** The actions and their spells, and the fixture items among them the fire staff. */
const PACKS = [...cutTo(ACTION_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const STAFF = '55555555-5555-4555-8555-555555555555';

const SLOT_CAST = 'Cast, 1 charge and a 3rd-rank slot';

/** Player Core 2's id for the entry with `slug`. */
function playerCore2(slug: string): string {
  return contentId(PackId.parse('player-core-2'), EntrySlug.parse(slug));
}

/** A 5th-level imperial sorcerer (arcane, spontaneous), who casts 3rd-rank spells, holding the fire staff. */
function sorcererWithStaff(): object {
  return {
    ...MERISIEL,
    level: 5,
    build: {
      choices: {
        ...MERISIEL.build.choices,
        class: playerCore2('class:sorcerer'),
        [`${playerCore2('class-feature:bloodline')}:0`]: playerCore2('class-feature:bloodline-imperial'),
      },
      spellAccess: [],
    },
    inventory: {
      items: [
        {
          id: STAFF,
          item: itemFixtureId(ItemFixture.FireStaff),
          quantity: 1,
          carry: { state: 'held', hands: 1 },
        },
      ],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

/** The play state with the staff prepared with 3 charges, `spent` of them spent. */
function preparedWith(spent: number, revision = 1): object {
  return {
    revision,
    play: { hp: { damage: 0, temp: 0 }, resources: { staff: { [STAFF]: { max: 3, spent } } } },
  };
}

function actionsSection(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('section[aria-labelledby="sheet-actions"]'));
}

/** The button of the Fireball row among the item actions that reads `label`. */
async function castButton(root: HTMLElement, label: string): Promise<HTMLButtonElement> {
  await openActionKind(root, 'Items');
  return vi.waitFor(() => {
    const row = present(
      [...actionsSection(root).querySelectorAll('pio-action-row')].find((candidate) =>
        textOf(candidate).includes('Fireball'),
      ),
    );
    return present([...row.querySelectorAll('button')].find((button) => textOf(button) === label));
  });
}

async function openActions(): Promise<HTMLElement> {
  const { root } = await openSheet(sorcererWithStaff(), {
    tab: SheetMode.Encounter,
    section: 'actions',
    play: preparedWith(0),
    packs: PACKS,
  });
  return root;
}

describe('CharacterSheetPage actions: a staff spell', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers a spontaneous caster each way to pay, labelled with the charges and slot it spends', async () => {
    const root = await openActions();

    const withSlot = await castButton(root, SLOT_CAST);
    const chargesOnly = await castButton(root, 'Cast, 3 charges');

    expect(withSlot.disabled).toBe(false);
    expect(chargesOnly.disabled).toBe(false);
  });

  it('records the slot in the spend, so taking it back gives the charges and the slot back', async () => {
    const root = await openActions();
    const withSlot = await castButton(root, SLOT_CAST);

    withSlot.click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'spendAction', staff: { item: STAFF, slot: expect.stringContaining('sorcerer') as string } },
      });
      request.flush({ ...preparedWith(1, 2), events: [] });
    });
  });
});
