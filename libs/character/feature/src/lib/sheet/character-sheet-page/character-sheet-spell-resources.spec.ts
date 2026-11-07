import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import type { OpenSheet } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { SPELL_CONTENT_KINDS } from '../sheet-prepared-spells';

const PLAY_URL = `/api/characters/${id}/play`;

/** Player Core with its feats, class features and spells: the slots a class table gives and the spells it casts. */
const PACKS = cutTo([...FEAT_CONTENT_KINDS, ...SPELL_CONTENT_KINDS]);

/** Merisiel as a `name`: a bard casts spontaneously and has focus spells, a cleric prepares and has none at level 1. */
function as(name: 'bard' | 'cleric'): object {
  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId(name) }, spellAccess: [] },
  };
}

/** The play state of a full-health character with `resources` spent, at `revision`. */
function spentOf(resources: object, revision = 1): object {
  return { revision, play: { hp: { damage: 0, temp: 0 }, resources } };
}

function panelOf(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('pio-sheet-spell-resources [role="group"]');
}

/** The text of the panel, which must be shown. */
function panelText(root: HTMLElement): string {
  return textOf(present(panelOf(root)));
}

/** The button named `name` in the panel, which must be shown. */
function buttonOf(root: HTMLElement, name: string): HTMLButtonElement {
  const buttons = [...present(panelOf(root)).querySelectorAll('button')];
  return present(buttons.find((button) => textOf(button) === name));
}

async function openSpells(character: object, resources: object = {}): Promise<OpenSheet> {
  return openSheet(character, { tab: SheetMode.Encounter, play: spentOf(resources), packs: PACKS });
}

describe('CharacterSheetPage spell resources panel', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it("shows a bard's slots per rank, less what is spent, with its focus points", async () => {
    const { root } = await openSpells(as('bard'), { slots: {}, 'focus-points': 0 });

    await vi.waitFor(() => {
      expect(panelText(root)).toMatch(/rank 1 slots\s*2 of 2/u);
    });
    expect(present(panelOf(root)).querySelector('pio-sheet-resources')).not.toBeNull();
  });

  it('keeps the focus points out of the sheet header', async () => {
    const { root } = await openSpells(as('bard'));

    await vi.waitFor(() => {
      expect(panelOf(root)).not.toBeNull();
    });
    const panel = present(panelOf(root));
    const outside = [...root.querySelectorAll('pio-sheet-resources')].filter((each) => !panel.contains(each));
    const text = outside.map((each) => textOf(each)).join(' ');
    expect(text).not.toContain('Focus Points');
  });

  it('spends a slot at the revision last read, and shows what the server answers', async () => {
    const { root } = await openSpells(as('bard'));
    await vi.waitFor(() => {
      expect(panelText(root)).toContain('2 of 2');
    });
    expect(buttonOf(root, 'Refund').disabled).toBe(true);

    buttonOf(root, 'Spend').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toMatchObject({ expectedRevision: 1, command: { field: 'spendSlot' } });
      const { slot } = (request.request.body as { command: { slot: string } }).command;
      request.flush(spentOf({ slots: { [slot]: 1 } }, 2));
    });
    await vi.waitFor(() => {
      expect(panelText(root)).toContain('1 of 2');
    });
  });

  it('shows no slot rows for a caster with prepared entries only, and no panel without focus points', async () => {
    const { root } = await openSpells(as('cleric'));

    await vi.waitFor(() => {
      expect(root.querySelector('pio-sheet-prepared-spells')).not.toBeNull();
    });
    expect(panelOf(root)).toBeNull();
  });
});
