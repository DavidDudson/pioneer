import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt } from '../../testing/sheet-page-harness';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

const SPELL_PACKS = cutTo(SPELL_CONTENT_KINDS);

/** Player Core's Detect Magic, a cantrip of every tradition. */
const DETECT_MAGIC = 'c91ac947-a9ec-5f07-b5f9-a054617eb571';

/** Player Core's Force Barrage, an arcane 1st-rank spell that takes 1 to 3 actions. */
const FORCE_BARRAGE = '1c97409b-bd67-5df2-a7d3-a49aff4d3896';

const OWN_TURN = { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false };

/** A wizard with `choices` picked. */
function wizard(choices: Readonly<Record<string, string>>): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('wizard'), ...choices }, spellAccess: [] },
  };
}

function playOf(turn: object): object {
  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn } };
}

function useButtons(root: HTMLElement): HTMLButtonElement[] {
  return [...root.querySelectorAll<HTMLButtonElement>('pio-sheet-prepared-spells pio-use-buttons button')];
}

function labels(buttons: readonly HTMLButtonElement[]): string[] {
  return buttons.map(({ textContent }) => textContent.replaceAll(/\s+/gu, ' ').trim());
}

describe('CharacterSheetPage casting a spell', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('spends the actions of a cantrip and no slot', async () => {
    const { root } = await openSheet(wizard({ 'prepared:wizard:cantrip:0': DETECT_MAGIC }), {
      packs: SPELL_PACKS,
      play: playOf(OWN_TURN),
    });
    await vi.waitFor(() => {
      expect(useButtons(root)).toHaveLength(1);
    });

    useButtons(root)[0]?.click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      const { command } = request.request.body as { command: object };
      expect(command).toMatchObject({ field: 'spendAction', action: expect.any(String) as string });
      expect(command).not.toHaveProperty('slot');
      request.flush({ ...playOf(OWN_TURN), events: [] });
    });
  });

  it('offers a version of a variable-action spell for each count of actions the turn holds', async () => {
    const { root } = await openSheet(wizard({ 'prepared:wizard:1:0': FORCE_BARRAGE }), {
      packs: SPELL_PACKS,
      play: playOf({ ...OWN_TURN, actions: 2 }),
    });

    await vi.waitFor(() => {
      expect(useButtons(root)).toHaveLength(2);
    });
    const distinct = new Set(labels(useButtons(root)));
    expect(distinct.size).toBe(2);
  });

  it('casts the version chosen, spending that many actions and the slot', async () => {
    const { root } = await openSheet(wizard({ 'prepared:wizard:1:0': FORCE_BARRAGE }), {
      packs: SPELL_PACKS,
      play: playOf(OWN_TURN),
    });
    await vi.waitFor(() => {
      expect(useButtons(root)).toHaveLength(3);
    });

    useButtons(root)[2]?.click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: {
          field: 'spendAction',
          cost: { kind: 'actions', count: 3 },
          slot: expect.stringContaining('wizard') as string,
        },
      });
      request.flush({ ...playOf(OWN_TURN), events: [] });
    });
  });
});
