import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
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

/** Player Core 2's id for the entry with `slug`. */
function playerCore2(slug: string): string {
  return contentId(PackId.parse('player-core-2'), EntrySlug.parse(slug));
}

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

/** A 5th-level imperial sorcerer (arcane, spontaneous), who casts 3rd-rank spells, holding the fire staff. */
function sorcererWithStaff(): object {
  const wizard = wizardWithStaff() as { build: { choices: Record<string, string> } };
  const choices = {
    ...wizard.build.choices,
    class: playerCore2('class:sorcerer'),
    [`${playerCore2('class-feature:bloodline')}:0`]: playerCore2('class-feature:bloodline-imperial'),
  };
  return { ...wizardWithStaff(), build: { choices, spellAccess: [] } };
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

  const SPEND = '00000000-0000-4000-8000-000000000001';

  /** The play state after one cast of the staff's spell: `spent` charges gone, and the cast on the spend log. */
  function castWith(spent: number, spell: string, revision: number): object {
    const prepared = preparedWith(spent, revision);
    return {
      ...prepared,
      events: [],
      play: {
        ...(prepared as { play: object }).play,
        turn: { phase: 'turn', actions: 2, quickened: 0, reactionUsed: false },
        spendLog: [
          {
            id: SPEND,
            action: spell,
            cost: { kind: 'actions', count: 1 },
            at: '2026-10-16T12:00:00.000Z',
            quickened: 0,
            staff: { item: STAFF, spell },
          },
        ],
      },
    };
  }

  it('casts a spell as a spend that records the staff cast, at the revision last read', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge').disabled).toBe(false);
    });

    buttonOf(staves, 'Cast, 1 charge').click();

    let spell = '';
    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'spendAction', staff: { item: STAFF } },
      });
      const { command } = request.request.body as { command: { action: string } };
      spell = command.action;
      request.flush(castWith(1, spell, 2));
    });
    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('2 of 3 charges');
    });
  });

  it('takes the cast back from the spend log, which sends undoSpend for the spend', async () => {
    const { root } = await openSheet(wizardWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge').disabled).toBe(false);
    });
    buttonOf(staves, 'Cast, 1 charge').click();
    let spell = '';
    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      spell = (request.request.body as { command: { action: string } }).command.action;
      request.flush(castWith(1, spell, 2));
    });
    const log = await vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-sheet-spend-log')));
    await vi.waitFor(() => {
      expect(textOf(log)).toContain('Breathe-fire');
    });

    present([...log.querySelectorAll('button')].find((button) => textOf(button) === 'Undo')).click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 2,
        command: { field: 'undoSpend', id: SPEND },
      });
      request.flush({ ...preparedWith(0, 3), events: [] });
    });
    await vi.waitFor(() => {
      expect(textOf(staves)).toContain('3 of 3 charges');
    });
  });

  it('pays a spontaneous caster’s cast with a slot too, sending the slot in the spend', async () => {
    const { root } = await openSheet(sorcererWithStaff(), { play: preparedWith(0), packs: PACKS });
    const staves = await stavesOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(staves, 'Cast, 1 charge and a 3rd-rank slot').disabled).toBe(false);
    });

    buttonOf(staves, 'Cast, 1 charge and a 3rd-rank slot').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'spendAction', staff: { item: STAFF, slot: expect.stringContaining('sorcerer') as string } },
      });
      request.flush({ ...preparedWith(1, 2), events: [] });
    });
  });
});
