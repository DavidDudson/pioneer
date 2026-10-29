import { SheetMode } from '@pioneer/character/domain';
import { playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';

/** Player Core's character kinds, its actions and the effects of Divine Mysteries. */
const PACKS = cutTo([...CHARACTER_CONTENT_KINDS, ContentKind.Action, ContentKind.Effect]);

const PLANT_FORM = '364d6d32-3a80-511d-95b1-952f32748076';
const HUMANOID_FORM = '2637bb3d-7377-5209-bc2c-97995c254a45';
const FIRST = '00000000-0000-4000-8000-000000000001';

/** Merisiel as a cleric, who casts. */
const CLERIC = {
  ...MERISIEL,
  build: {
    choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric'), 'boost:1:class:0': 'wis' },
  },
};

function inForm(effect: string, form: string, rank: number): object {
  const effects = [{ id: FIRST, effect, source: { kind: 'self' }, form, rank }];
  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, effects } };
}

const plant = inForm(PLANT_FORM, 'plant-form:flytrap', 6);
const humanoid = inForm(HUMANOID_FORM, 'humanoid-form:large', 5);

function section(root: HTMLElement, anchor: string): HTMLElement {
  return present(root.querySelector<HTMLElement>(`section[aria-labelledby="${anchor}"]`));
}

/** Both sections render asynchronously, and a loaded runner can take longer than waitFor's one second default. */
const SLOW_RENDER = 10_000;

describe('CharacterSheetPage form limits', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('says in the spellcasting section that the form forbids casting', async () => {
    const { root } = await openSheet(CLERIC, { tab: SheetMode.Encounter, play: plant, packs: PACKS });

    await vi.waitFor(
      () => {
        expect(textOf(section(root, 'sheet-spellcasting'))).toContain(
          "Spell Effect: Plant Form: you can't cast spells.",
        );
      },
      { timeout: SLOW_RENDER },
    );
  });

  it('gives the Cast a Spell action the form as the reason it is unavailable', async () => {
    const { root } = await openSheet(CLERIC, { tab: SheetMode.Encounter, play: plant, packs: PACKS });

    const all = await vi.waitFor(
      () =>
        present(
          [
            ...section(root, 'sheet-actions').querySelectorAll<HTMLElement>('button, [role="radio"], [role="tab"]'),
          ].find((control) => textOf(control) === 'All'),
        ),
      { timeout: SLOW_RENDER },
    );
    all.click();

    await vi.waitFor(
      () => {
        expect(textOf(section(root, 'sheet-actions'))).toContain("Can't cast spells in");
      },
      { timeout: SLOW_RENDER },
    );
  });

  it('says nothing of casting in a form that lets the character cast', async () => {
    const { root } = await openSheet(CLERIC, { tab: SheetMode.Encounter, play: humanoid, packs: PACKS });

    await vi.waitFor(
      () => {
        expect(textOf(section(root, 'sheet-spellcasting')).length).toBeGreaterThan(0);
        expect(textOf(section(root, 'sheet-actions')).length).toBeGreaterThan(0);
      },
      { timeout: SLOW_RENDER },
    );
    expect(textOf(section(root, 'sheet-spellcasting'))).not.toContain("you can't cast spells");
    expect(textOf(section(root, 'sheet-actions'))).not.toContain("Can't cast spells in");
  });
});
