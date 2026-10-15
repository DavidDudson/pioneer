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

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its spells, and the fixture items among them the fire staff. */
const PACKS = [...cutTo(SPELL_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const STAFF = '55555555-5555-4555-8555-555555555555';

/** A 5th-level wizard, who casts 3rd-rank spells, holding the fire staff. */
function wizardWithStaff(): object {
  return {
    ...MERISIEL,
    level: 5,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('wizard') }, spellAccess: [] },
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

async function stavesOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-staff-spells')));
}

function buttonOf(staves: HTMLElement, name: string): HTMLButtonElement {
  return present([...staves.querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage staff casts', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('labels each way to cast with what it spends before anything applies', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);

    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge').disabled).toBe(false);
    });
    expect(buttonOf(staves, 'Cast, heightened to 3rd rank, no charges').disabled).toBe(false);
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('offers no cast the staff cannot pay for', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(3), packs: PACKS });
    const staves = await stavesOf(root);

    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('0 of 3 charges');
    });
    const labels = [...staves.querySelectorAll('button')].map((button) => textOf(button));
    expect(labels).not.toContain('Cast, 1 charge');
    expect(labels).toContain('Cast, heightened to 3rd rank, no charges');
  });

  it('casts a spell at the revision last read, then offers to take the cast back', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge').disabled).toBe(false);
    });

    buttonOf(staves, 'Cast, 1 charge').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'castStaff', item: STAFF },
      });
      request.flush(preparedWith(1, 2));
    });
    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('2 of 3 charges');
      expect(buttonOf(staves, 'Undo Breathe-fire').disabled).toBe(false);
    });
  });

  it('takes the last cast back, which sends the same cast to be refunded', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge').disabled).toBe(false);
    });
    buttonOf(staves, 'Cast, 1 charge').click();
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL }).flush(preparedWith(1, 2));
    });
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Undo Breathe-fire').disabled).toBe(false);
    });

    buttonOf(staves, 'Undo Breathe-fire').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 2,
        command: { field: 'uncastStaff', item: STAFF },
      });
      request.flush(preparedWith(0, 3));
    });
    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('3 of 3 charges');
    });
  });
});
