import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter, 'spellcasting');

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its spells, and the fixture items among them the scroll of Fireball. */
const PACKS = [...cutTo(SPELL_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const SCROLL = '77777777-7777-4777-8777-777777777777';
const SCROLL_ITEM = itemFixtureId(ItemFixture.FireballScroll);

/** A character carrying the scroll of Fireball as `fields` say; `casts` says whether it has a spellcasting class. */
function carrying(casts: boolean, fields: object = {}): object {
  const cls = casts ? playerCoreClassId('wizard') : playerCoreClassId('fighter');
  return {
    ...MERISIEL,
    level: 5,
    build: { choices: { ...MERISIEL.build.choices, class: cls }, spellAccess: [] },
    inventory: {
      items: [{ id: SCROLL, item: SCROLL_ITEM, quantity: 1, carry: { state: 'held', hands: 1 }, ...fields }],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

/** The spell list once a scroll's row is in it. */
async function listOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => {
    present(root.querySelector('pio-spell-item-controls'));
    return present(root.querySelector<HTMLElement>('pio-spell-row-list'));
  });
}

describe('CharacterSheetPage scrolls', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('lists the spell of a scroll with the scroll as its source, even for a character who casts nothing', async () => {
    const { root } = await openSheet(carrying(false), { packs: PACKS });
    const list = await listOf(root);

    await vi.waitFor(() => {
      expect(textOf(list)).toContain('Fireball');
    });
    expect(textOf(list)).toContain('Cast');
  });

  it('casts the scroll as a use of its item, spending its spell’s actions', async () => {
    const { root } = await openSheet(carrying(true), { packs: PACKS });
    const list = await listOf(root);

    present([...list.querySelectorAll('button')].find((button) => textOf(button) === 'Cast')).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'useConsumable', item: SCROLL, spend: { action: SCROLL_ITEM } },
      });
    });
  });
});
