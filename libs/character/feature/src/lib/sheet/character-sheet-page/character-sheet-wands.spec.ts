import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, playerCoreClassId } from '@pioneer/character/domain/testing';
import { RANDOM_SOURCE } from '@pioneer/play/ui';
import { DieFace } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;
const CHARACTER_URL = `/api/characters/${id}`;

/** Player Core with its spells, and the fixture items among them the wand of Fireball. */
const PACKS = [...cutTo(SPELL_CONTENT_KINDS), ITEM_FIXTURE_FILES];

const WAND = '66666666-6666-4666-8666-666666666666';
const HELD = { state: 'held', hands: 1 };

/** A wizard who casts 3rd-rank spells carrying the wand of Fireball as `fields` say. */
function wizardWith(fields: object): object {
  return {
    ...MERISIEL,
    level: 5,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('wizard') }, spellAccess: [] },
    inventory: {
      items: [{ id: WAND, item: itemFixtureId(ItemFixture.FireballWand), quantity: 1, carry: HELD, ...fields }],
      coins: { pp: 0, gp: 0, sp: 0, cp: 0 },
    },
  };
}

/** The play state with `uses` spent, by the key of the wand count they came from. */
function spentOf(uses: object, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, resources: { uses } } };
}

const CAST_SPENT = { [`wand:${WAND}`]: 1 };
const BOTH_SPENT = { [`wand:${WAND}`]: 1, [`wand:${WAND}:overcharge`]: 1 };

/** The d20 faces the next flat checks roll. */
function rolling(...faces: readonly number[]): void {
  TestBed.configureTestingModule({
    providers: [{ provide: RANDOM_SOURCE, useValue: scriptedRandom(faces.map((face) => DieFace.parse(face))) }],
  });
}

/** The wand's section once its spell loads, past the empty host shown until it does. */
async function wandsOf(root: HTMLElement): Promise<HTMLElement> {
  return vi.waitFor(() => present(root.querySelector<HTMLElement>('pio-wand-spells')));
}

function buttonOf(wands: HTMLElement, name: string): HTMLButtonElement {
  return present([...wands.querySelectorAll('button')].find((button) => textOf(button) === name));
}

describe('CharacterSheetPage wands', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("lists a held wand's spell and the cast it has for the day", async () => {
    const { root } = await openSheet(wizardWith({}), { play: spentOf({}), packs: PACKS });
    const wands = await wandsOf(root);

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('1 of 1 cast today');
    });
    expect(textOf(wands)).toContain('Fireball');
    expect(buttonOf(wands, 'Cast').disabled).toBe(false);
    expect(buttonOf(wands, 'Overcharge').disabled).toBe(true);
  });

  it('shows no section for a wand that is stowed', async () => {
    const { root } = await openSheet(wizardWith({ carry: { state: 'stowed' } }), { packs: PACKS });

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(root.querySelector('pio-wand-spells')).toBeNull();
  });

  it('casts the day spell at the revision last read, and then offers the overcharge', async () => {
    const { root } = await openSheet(wizardWith({}), { play: spentOf({}), packs: PACKS });
    const wands = await wandsOf(root);
    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('1 of 1 cast today');
    });

    buttonOf(wands, 'Cast').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'castWand', item: WAND },
      });
      request.flush(spentOf(CAST_SPENT, 2));
    });
    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('0 of 1 cast today');
      expect(buttonOf(wands, 'Cast').disabled).toBe(true);
      expect(buttonOf(wands, 'Overcharge').disabled).toBe(false);
    });
  });

  it('shows a passed flat check and what it comes to before anything applies', async () => {
    rolling(14);
    const { root } = await openSheet(wizardWith({}), { play: spentOf(CAST_SPENT), packs: PACKS });
    const wands = await wandsOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(wands, 'Overcharge').disabled).toBe(false);
    });

    buttonOf(wands, 'Overcharge').click();

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Flat check: rolled 14 against DC 10.');
    });
    expect(textOf(wands)).toContain('Success: the spell is cast and the wand breaks.');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('shows a failed flat check as the wand destroyed', async () => {
    rolling(3);
    const { root } = await openSheet(wizardWith({}), { play: spentOf(CAST_SPENT), packs: PACKS });
    const wands = await wandsOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(wands, 'Overcharge').disabled).toBe(false);
    });

    buttonOf(wands, 'Overcharge').click();

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Flat check: rolled 3 against DC 10.');
    });
    expect(textOf(wands)).toContain('Failure: the wand is destroyed and the spell is not cast.');
  });

  it('applies a confirmed overcharge with the roll, and reads the character again', async () => {
    rolling(14);
    const { root } = await openSheet(wizardWith({}), { play: spentOf(CAST_SPENT), packs: PACKS });
    const wands = await wandsOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(wands, 'Overcharge').disabled).toBe(false);
    });
    buttonOf(wands, 'Overcharge').click();
    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Flat check');
    });

    buttonOf(wands, 'Overcharge').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'overchargeWand', item: WAND, roll: 14 },
      });
      request.flush(spentOf(BOTH_SPENT, 2));
    });
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: CHARACTER_URL });
    });
  });

  it('shows a wand already overcharged today as destroyed without a roll', async () => {
    rolling(18);
    const { root } = await openSheet(wizardWith({}), { play: spentOf(BOTH_SPENT), packs: PACKS });
    const wands = await wandsOf(root);
    await vi.waitFor(() => {
      expect(buttonOf(wands, 'Overcharge').disabled).toBe(false);
    });

    buttonOf(wands, 'Overcharge').click();

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Already overcharged today');
    });
    expect(textOf(wands)).not.toContain('Flat check');
  });

  it('shows a broken wand as broken and cannot cast it, and marks it repaired', async () => {
    const { root } = await openSheet(wizardWith({ broken: true }), { play: spentOf({}), packs: PACKS });
    const wands = await wandsOf(root);

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Broken');
    });
    expect(buttonOf(wands, 'Cast').disabled).toBe(true);

    buttonOf(wands, 'Mark repaired').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: CHARACTER_URL });
      expect(request.request.body).toMatchObject({ patch: { field: 'setItemBroken', id: WAND, broken: false } });
    });
  });

  it('shows a wand whose spell the holder has no list for as unavailable, with the reason', async () => {
    const fighter = {
      ...wizardWith({}),
      build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('fighter') }, spellAccess: [] },
    };
    const { root } = await openSheet(fighter, { play: spentOf({}), packs: PACKS });
    const wands = await wandsOf(root);

    await vi.waitFor(() => {
      expect(textOf(wands)).toContain('Not on any of your spell lists');
    });
    expect(buttonOf(wands, 'Cast').disabled).toBe(true);
  });
});
