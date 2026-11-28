import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  playerCoreClassId,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { ContentKind } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../../data/content-registry-query';
import type { JsonObject } from '../../testing/json-fixture';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../testing/provide-server-state-testing';
import { id, MERISIEL, openSheet, present } from '../../testing/sheet-page-harness';
import { textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { EQUIPMENT_CONTENT_KINDS } from '../sheet-equipment';

const PLAY_URL = `/api/characters/${id}/play`;

const PACKS = [
  ...cutTo([...CHARACTER_CONTENT_KINDS, ...EQUIPMENT_CONTENT_KINDS, ContentKind.Effect]),
  ITEM_FIXTURE_FILES,
];

const ARMOUR = '55555555-5555-4555-8555-555555555555';
const CONSULT_THE_SPIRITS = '129b46b6-7a1e-5ab5-a7a6-dc34edcdcb5f';
const FIRST = '00000000-0000-4000-8000-000000000001';
const END_BY_SAVE = 'New save succeeded: end it';

/** Merisiel as a cleric, wearing invested leather armour with a spellwatch rune when `spellwatch`. */
function wearing(spellwatch: boolean): JsonObject {
  const runes = spellwatch
    ? { runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Spellwatch) }] } }
    : {};

  const armour = {
    id: ARMOUR,
    item: itemFixtureId(ItemFixture.LeatherArmor),
    quantity: 1,
    carry: { state: 'worn' },
    invested: true,
    ...runes,
  };

  return {
    ...MERISIEL,
    build: { choices: { ...MERISIEL.build.choices, class: playerCoreClassId('cleric') } },
    inventory: { items: [armour], coins: { pp: 0, gp: 0, sp: 0, cp: 0 } },
  };
}

/** The play state of a full-health character with an effect from `source` on it. */
function playFrom(source: JsonObject): JsonObject {
  const effect = { id: FIRST, effect: CONSULT_THE_SPIRITS, source };

  return { revision: 1, play: { hp: { damage: 0, temp: 0 }, effects: [effect] } };
}

function effectsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-effects'));
}

function endButtons(root: HTMLElement): ReadonlyArray<HTMLButtonElement> {
  return [...effectsOf(root).querySelectorAll('button')].filter((button) => textOf(button) === END_BY_SAVE);
}

describe('CharacterSheetPage spellwatch', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers a new save against a hostile spell, and a success ends it', async () => {
    const { root } = await openSheet(wearing(true), { play: playFrom({ kind: 'gm' }), packs: PACKS });

    await vi.waitFor(() => {
      expect(endButtons(root)).toHaveLength(1);
    });
    expect(textOf(effectsOf(root))).toContain('attempt a new save against one hostile spell');

    endButtons(root)[0]?.click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'removeEffect', id: FIRST },
      });
    });
  });

  it.each([{ kind: 'self' }, { kind: 'ally', name: 'Seoni' }])(
    'offers nothing against an effect from $kind',
    async (source) => {
      const { root } = await openSheet(wearing(true), { play: playFrom(source), packs: PACKS });

      await vi.waitFor(() => {
        expect(textOf(effectsOf(root))).toContain('attempt a new save');
      });
      expect(endButtons(root)).toHaveLength(0);
    },
  );

  it('offers nothing without a spellwatch rune', async () => {
    const { root } = await openSheet(wearing(false), { play: playFrom({ kind: 'gm' }), packs: PACKS });

    await vi.waitFor(() => {
      expect(textOf(effectsOf(root))).toContain('From the GM');
    });
    expect(endButtons(root)).toHaveLength(0);
    expect(textOf(effectsOf(root))).not.toContain('attempt a new save');
  });
});
