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
import { id, MERISIEL, openSheet, playOf, present } from '../../testing/sheet-page-harness';
import { fakeDialog, render, textOf } from '../../testing/sheet-tabs-testing';
import { cutTo } from '../../testing/test-packs';
import { EQUIPMENT_CONTENT_KINDS } from '../sheet-equipment';

const PLAY_URL = `/api/characters/${id}/play`;

const PACKS = [
  ...cutTo([...CHARACTER_CONTENT_KINDS, ...EQUIPMENT_CONTENT_KINDS, ContentKind.Action]),
  ITEM_FIXTURE_FILES,
];

const ARMOUR = '55555555-5555-4555-8555-555555555555';
const BONUS = 2;
const TYPED_AMOUNT = 4;

/** Merisiel as a cleric, wearing invested leather armour with a moonweave rune when `moonweave`. */
function wearing(moonweave: boolean): JsonObject {
  const runes = moonweave ? { runes: { potency: 1, property: [{ rune: runeFixtureId(RuneFixture.Moonweave) }] } } : {};

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

function controlsOf(root: HTMLElement): HTMLElement {
  return present(root.querySelector<HTMLElement>('pio-sheet-hit-point-controls'));
}

function buttonOf(root: HTMLElement, text: string): HTMLButtonElement {
  return present([...controlsOf(root).querySelectorAll('button')].find((button) => textOf(button).includes(text)));
}

async function openControls(root: HTMLElement): Promise<void> {
  fakeDialog();
  present(root.querySelector<HTMLElement>('pio-sheet-character-block button')).click();
  await vi.waitFor(() => {
    expect(controlsOf(root).querySelector('input[aria-label="Amount"]')).not.toBeNull();
  });
}

describe('CharacterSheetPage healing from a spell or effect', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting([], PACKS);
  }, PREBUILD_TIMEOUT);

  it('offers the Hit Points a moonweave rune adds, named by the rune', async () => {
    const { root } = await openSheet(wearing(true), { play: playOf(6, 0), packs: PACKS });
    await openControls(root);

    await vi.waitFor(() => {
      expect(textOf(controlsOf(root))).toContain(`From a spell or effect: +${BONUS} from Moonweave`);
    });
  });

  it('adds them to the healing sent when the healing is from a spell or effect', async () => {
    const { root } = await openSheet(wearing(true), { play: playOf(6, 0), packs: PACKS });
    await openControls(root);
    await vi.waitFor(() => {
      expect(textOf(controlsOf(root))).toContain('From a spell or effect');
    });

    const input = present(controlsOf(root).querySelector<HTMLInputElement>('input[aria-label="Amount"]'));
    input.value = String(TYPED_AMOUNT);
    input.dispatchEvent(new Event('input'));
    render();
    buttonOf(root, 'From a spell or effect').click();
    render();
    buttonOf(root, 'Heal').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'heal', amount: TYPED_AMOUNT + BONUS },
      });
      request.flush(playOf(0, 0, 2));
    });
  });

  it('adds nothing to healing not marked as from a spell or effect', async () => {
    const { root } = await openSheet(wearing(true), { play: playOf(6, 0), packs: PACKS });
    await openControls(root);
    await vi.waitFor(() => {
      expect(textOf(controlsOf(root))).toContain('From a spell or effect');
    });

    const input = present(controlsOf(root).querySelector<HTMLInputElement>('input[aria-label="Amount"]'));
    input.value = String(TYPED_AMOUNT);
    input.dispatchEvent(new Event('input'));
    render();
    buttonOf(root, 'Heal').click();

    await vi.waitFor(() => {
      const request = TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: PLAY_URL });
      expect(request.request.body).toStrictEqual({
        expectedRevision: 1,
        command: { field: 'heal', amount: TYPED_AMOUNT },
      });
    });
  });

  it('offers nothing without a rune that adds Hit Points to healing', async () => {
    const { root } = await openSheet(wearing(false), { play: playOf(6, 0), packs: PACKS });
    await openControls(root);

    expect(textOf(controlsOf(root))).not.toContain('From a spell or effect');
  });
});
