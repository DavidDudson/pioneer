import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { fakeDialog, textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

/** Player Core's character kinds and the effects of Divine Mysteries. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Action, ContentKind.Effect]);

const ANIMAL_FORM_APE = '0864651a-fc5b-52be-99a6-6f40369fa731';
const FIRST = '00000000-0000-4000-8000-000000000001';
const RANK = 4;

const ape = {
  revision: 1,
  play: {
    hp: { damage: 0, temp: 0 },
    effects: [{ id: FIRST, effect: ANIMAL_FORM_APE, source: { kind: 'self' }, rank: RANK }],
  },
};

/** Merisiel as a cleric, so Hit Points show. */
const CLERIC = {
  ...MERISIEL,
  build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric') } },
};

function vitalsOf(root: HTMLElement): string {
  return textOf(present(root.querySelector<HTMLElement>('pio-vitals')));
}

/** The Hit Points controls, in the drawer the block opens. */
function hitPointControlsOf(root: HTMLElement): string {
  return textOf(present(root.querySelector<HTMLElement>('pio-sheet-hit-point-controls')));
}

/** Presses the Hit Points block, which opens the controls. */
function openHitPoints(root: HTMLElement): void {
  fakeDialog();
  present(root.querySelector<HTMLElement>('pio-sheet-hit-points button')).click();
}

describe('CharacterSheetPage form speed and size', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('shows the land Speed, and marks it as from the form when a form sets it', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter, play: ape, packs: PACKS });

    await vi.waitFor(() => {
      expect(vitalsOf(root)).toMatch(/Speed\s*25\s*from [^;]*Animal Form/u);
    });
  });

  it('shows the land Speed unmarked while no form is in play', async () => {
    const { root } = await openSheet(MERISIEL, { tab: SheetMode.Encounter, packs: PACKS });

    await vi.waitFor(() => {
      expect(vitalsOf(root)).toMatch(/Speed\s*\d+/u);
    });
    expect(vitalsOf(root)).not.toMatch(/Speed\s*\d+\s*from/u);
  });

  it('says the form sets the size and what the character’s own is', async () => {
    const { root } = await openSheet(CLERIC, { tab: SheetMode.Encounter, play: ape, packs: PACKS });

    await vi.waitFor(() => {
      openHitPoints(root);
      expect(hitPointControlsOf(root)).toMatch(
        /Size Large, reach \d+ feet, from [^;]*Animal Form[^;]*; your own size is Medium\./u,
      );
    });
  });
});
