import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { offeredLabels, pickerCount, pickLoadedRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, openSheet, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

const PLAY_URL = `/api/characters/${id}/play`;
const ALLIES_URL = `/api/characters/${id}/allies`;

/** Player Core's character kinds and the effects of Divine Mysteries. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Effect]);

const EMPOWERED_ONSLAUGHT = '963ae779-6771-5e53-a0a5-668aa2ee79ca';
const CONSULT_THE_SPIRITS = '129b46b6-7a1e-5ab5-a7a6-dc34edcdcb5f';
const PLANT_FORM = '364d6d32-3a80-511d-95b1-952f32748076';
const SEONI = '11111111-1111-4111-8111-111111111111';
const FIRST = '00000000-0000-4000-8000-000000000001';

/** The play state of a full-health character with `effects` on it, at `revision`. */
function playWith(effects: readonly object[], revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, effects } };
}

const onslaught = (badge: number): object => ({
  id: FIRST,
  effect: EMPOWERED_ONSLAUGHT,
  source: { kind: 'self' },
  badge,
});

function effectsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-effects'));
}

function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  return present([...effectsOf(root).querySelectorAll('button')].find((button) => textOf(button) === name));
}

/** What a pick reaches: the harness holding the sheet and its root. */
type SheetView = Pick<OpenSheet, 'harness' | 'root'>;

/** Picks the option named `name` in the picker with `index` among the effects' pickers. */
async function pick(sheet: SheetView, index: number, name: string): Promise<void> {
  await pickLoadedRow(sheet.harness, effectsOf(sheet.root), { matches: (label) => label === name, index });
  await TestBed.inject(ApplicationRef).whenStable();
}

/** The names the picker with `index` among the effects' pickers offers. */
function offered(sheet: SheetView, index: number): readonly string[] {
  return offeredLabels(sheet.harness, effectsOf(sheet.root), index);
}

/** Answers the read of the party, which the picker makes once an ally is the source. */
async function answerAllies(allies: object): Promise<void> {
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController).expectOne({ method: 'GET', url: ALLIES_URL }).flush(allies);
  });
  await TestBed.inject(ApplicationRef).whenStable();
}

/** Waits for the party's picker, which renders once the read of the party is in. */
async function partyShown({ harness, root }: SheetView): Promise<void> {
  await vi.waitFor(() => {
    expect(pickerCount(harness, effectsOf(root))).toBe(3);
  });
}

describe('CharacterSheetPage effects', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('says so when the character has no effects', async () => {
    const { root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });
  });

  it('shows each effect with its badge and who it came from', async () => {
    const ally = { id: FIRST, effect: EMPOWERED_ONSLAUGHT, source: { kind: 'ally', name: 'Seoni' }, badge: 2 };
    const { root } = await openSheet(undefined, { play: playWith([ally]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toMatch(/Empowered Onslaught\s*2/u);
    });
    expect(textOf(effectsOf(root))).toContain('From Seoni');
  });

  it('shows the rounds an effect has left', async () => {
    const lasting = { id: FIRST, effect: CONSULT_THE_SPIRITS, source: { kind: 'self' }, remaining: 14_400 };
    const { root } = await openSheet(undefined, { play: playWith([lasting]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('14,400 rounds left');
    });
  });

  it('steps a counter badge within its bounds, at the revision last read', async () => {
    const { root } = await openSheet(undefined, { play: playWith([onslaught(1)]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toMatch(/Empowered Onslaught\s*1/u);
    });
    expect(buttonOf(root, 'Lower').disabled).toBe(true);

    buttonOf(root, 'Raise').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        expectedRevision: 1,
        command: { field: 'setEffectBadge', id: FIRST, value: 2 },
      });
      request.flush(playWith([onslaught(2)], 2));
    });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toMatch(/Empowered Onslaught\s*2/u);
    });
  });

  it('dismisses an effect', async () => {
    const { root } = await openSheet(undefined, { play: playWith([onslaught(1)]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toMatch(/Empowered Onslaught\s*1/u);
    });

    buttonOf(root, 'Dismiss').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ command: { field: 'removeEffect', id: FIRST } });
      request.flush(playWith([], 2));
    });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });
  });

  it('applies a polymorph effect with the form chosen and the rank it is cast at', async () => {
    const { harness, root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });

    await pick({ harness, root }, 0, 'Spell Effect: Plant Form');
    expect(buttonOf(root, 'Apply').disabled).toBe(true);
    await pick({ harness, root }, 1, 'Arboreal');
    await pick({ harness, root }, 2, 'Rank 6');
    expect(buttonOf(root, 'Apply').disabled).toBe(false);
    buttonOf(root, 'Apply').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'applyEffect', form: 'plant-form:arboreal', rank: 6 },
      });
      request.flush(playWith([], 2));
    });
  });

  it('shows the form and rank of an active polymorph effect', async () => {
    const plant = {
      id: FIRST,
      effect: PLANT_FORM,
      source: { kind: 'self' },
      form: 'plant-form:flytrap',
      rank: 6,
    };
    const { root } = await openSheet(undefined, { play: playWith([plant]), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('Flytrap form');
    });
    expect(textOf(effectsOf(root))).toContain('Rank 6');
  });

  it('offers a form only from the rank its spell needs', async () => {
    const { harness, root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });

    await pick({ harness, root }, 0, 'Spell Effect: Humanoid Form');
    expect(offered({ harness, root }, 1)).toStrictEqual(['Small Humanoid', 'Medium Humanoid']);
    await pick({ harness, root }, 2, 'Rank 5');
    expect(offered({ harness, root }, 1)).toStrictEqual(['Small Humanoid', 'Medium Humanoid', 'Large Humanoid']);
  });

  it('applies the effect picked from an ally, who needs a name', async () => {
    const { harness, root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });
    expect(buttonOf(root, 'Apply').disabled).toBe(true);

    await pick({ harness, root }, 0, 'Effect: Consult the Spirits');
    expect(buttonOf(root, 'Apply').disabled).toBe(false);
    await pick({ harness, root }, 1, 'An ally');
    await answerAllies({ allies: [] });
    expect(buttonOf(root, 'Apply').disabled).toBe(true);
    const name = present(effectsOf(root).querySelector<HTMLInputElement>('input'));
    name.value = 'Seoni';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await TestBed.inject(ApplicationRef).whenStable();
    buttonOf(root, 'Apply').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: {
          field: 'applyEffect',
          effect: CONSULT_THE_SPIRITS,
          source: { kind: 'ally', name: 'Seoni' },
        },
      });
      request.flush(playWith([], 2));
    });
  });

  it('applies the effect from a character in the campaign, recording who', async () => {
    const { harness, root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });
    await pick({ harness, root }, 0, 'Effect: Consult the Spirits');
    await pick({ harness, root }, 1, 'An ally');
    await answerAllies({
      campaign: 'Abomination Vaults',
      allies: [{ characterId: SEONI, name: 'Seoni' }],
    });
    await partyShown({ harness, root });
    expect(buttonOf(root, 'Apply').disabled).toBe(true);
    expect(effectsOf(root).querySelector('input')).toBeNull();

    await pick({ harness, root }, 2, 'Seoni');
    expect(buttonOf(root, 'Apply').disabled).toBe(false);
    buttonOf(root, 'Apply').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({
        command: { field: 'applyEffect', source: { kind: 'ally', name: 'Seoni', characterId: SEONI } },
      });
      request.flush(playWith([], 2));
    });
  });

  it('types the name of someone outside the party', async () => {
    const { harness, root } = await openSheet(undefined, { play: playWith([]), packs: PACKS });
    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('No effects');
    });
    await pick({ harness, root }, 0, 'Effect: Consult the Spirits');
    await pick({ harness, root }, 1, 'An ally');
    await answerAllies({ campaign: 'Abomination Vaults', allies: [{ characterId: SEONI, name: 'Seoni' }] });
    await partyShown({ harness, root });

    await pick({ harness, root }, 2, 'Someone else');

    expect(buttonOf(root, 'Apply').disabled).toBe(true);
    expect(effectsOf(root).querySelector('input')).not.toBeNull();
  });
});
