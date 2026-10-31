import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { pickRow } from '../../testing/option-picker-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openerAt, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const openSheet = openerAt(SheetMode.Encounter);

const PLAY_URL = `/api/characters/${id}/play`;

/** The spells, and the effects the forms of a battle form spell are. */
const PACKS = cutTo([...SPELL_CONTENT_KINDS, ContentKind.Effect]);

/** Player Core's Animal Form, a primal 2nd-rank spell that takes 2 actions. */
const ANIMAL_FORM = 'cd4bcdfa-81d7-5e23-a964-0230a0f6cc94';

const OWN_TURN = { phase: 'turn', actions: 3, quickened: 0, reactionUsed: false };

/** A 3rd-level druid, who has 2nd-rank slots, with Animal Form prepared in one. */
const DRUID = {
  ...MERISIEL,
  level: 3,
  build: {
    choices: { ...MERISIEL.build.choices, class: playerCoreClassId('druid'), 'prepared:druid:2:0': ANIMAL_FORM },
    spellAccess: [],
  },
};

const PLAY = { revision: 1, play: { hp: { damage: 0, temp: 0 }, turn: OWN_TURN } };

/** What a pick reaches: the harness holding the sheet and its root. */
type Opened = Pick<OpenSheet, 'harness' | 'root'>;

function pickerOf(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('pio-form-picker');
}

function buttonIn(root: HTMLElement, name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((button) => textOf(button) === name);
  return present(found);
}

/** Casts Animal Form from its use button and waits for the picker to open. */
async function openPicker(): Promise<Opened> {
  const { harness, root } = await openSheet(DRUID, { packs: PACKS, play: PLAY });
  const cast = await vi.waitFor(() =>
    present(root.querySelector<HTMLButtonElement>('pio-sheet-prepared-spells pio-use-buttons button')),
  );
  cast.click();
  await vi.waitFor(() => {
    expect(pickerOf(root)).not.toBeNull();
  });
  return { harness, root };
}

/** Picks the form whose label contains `name`. */
function pickForm({ harness, root }: Opened, name: string): void {
  pickRow(harness, present(pickerOf(root)), { matches: (label) => label.includes(name) });
}

describe('CharacterSheetPage casting a form spell', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('opens the form picker and spends nothing until a form is confirmed', async () => {
    const { root } = await openPicker();

    expect(textOf(pickerOf(root))).toContain('Cast Animal Form: choose a form');
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('closes on Cancel and spends nothing', async () => {
    const { root } = await openPicker();

    buttonIn(root, 'Cancel').click();

    await vi.waitFor(() => {
      expect(pickerOf(root)).toBeNull();
    });
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: PLAY_URL });
  });

  it('spends the cast and puts the form on the character in one edit when a form is confirmed', async () => {
    const opened = await openPicker();
    const { root } = opened;
    pickForm(opened, 'Ape');
    await vi.waitFor(() => {
      expect(textOf(pickerOf(root))).toContain('in the form');
    });

    buttonIn(root, 'Cast and transform').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      const { command } = request.request.body as { command: object };
      expect(command).toMatchObject({ field: 'spendAction', action: ANIMAL_FORM, apply: { rank: 2 } });
      request.flush({ ...PLAY, events: [] });
    });
  });
});
