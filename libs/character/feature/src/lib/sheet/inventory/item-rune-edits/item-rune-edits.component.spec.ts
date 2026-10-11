import {
  ITEM_FIXTURE_FILES,
  ItemFixture,
  itemFixtureId,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  button,
  field,
  openInventory,
  patchSent,
  pick,
  present,
  row,
  settle,
  SWORD,
  VALEROS,
} from '../../../testing/inventory-sheet-testing';
import { PREBUILD_TIMEOUT, prebuildServerStateTesting } from '../../../testing/provide-server-state-testing';

/** The options the open select lists. */
async function optionsShown(): Promise<string[]> {
  return vi.waitFor(() => {
    const shown = [...document.querySelectorAll<HTMLElement>('[role="option"]')].map((each) => each.textContent.trim());
    expect(shown.length).toBeGreaterThan(0);
    return shown;
  });
}

const FLAMING_POTENCY_1 = { potency: 1, property: [runeFixtureId(RuneFixture.Flaming)] };

const RUNED_SWORD = { ...VALEROS.inventory.items.find((item) => item.id === SWORD), runes: FLAMING_POTENCY_1 };

/** Valeros as the server returns him once his longsword is +1 flaming. */
const RUNED = {
  ...VALEROS,
  version: 4,
  inventory: {
    ...VALEROS.inventory,
    items: VALEROS.inventory.items.map((item) => (item.id === SWORD ? RUNED_SWORD : item)),
  },
};

const SPARE = '88888888-8888-4888-8888-888888888888';

/** Valeros once his longsword is +1 flaming, with a second longsword stowed to move runes onto. */
const RUNED_PAIR = {
  ...RUNED,
  inventory: {
    ...RUNED.inventory,
    items: [...RUNED.inventory.items, { id: SPARE, item: itemFixtureId(ItemFixture.Longsword), quantity: 1 }],
  },
};

/** Etches +1 potency onto the sword and has the server return `character`. */
async function etchedAs(section: HTMLElement, character: object): Promise<void> {
  const potency = field(row(section, 'Longsword'), 'Potency rune on Longsword');
  present(potency.querySelector<HTMLElement>('button')).click();
  await settle();
  await pick(potency, 'fr-select button', '+1');
  const etched = await patchSent();
  etched.flush({ character, slots: [], cleared: [], languages: { known: [], open: 0 } });
}

describe('InventorySection runes', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting([ITEM_FIXTURE_FILES]);
  }, PREBUILD_TIMEOUT);

  it('etches a potency rune onto the sword by sending its grade', async () => {
    const section = await openInventory();
    const potency = field(row(section, 'Longsword'), 'Potency rune on Longsword');
    present(potency.querySelector<HTMLElement>('button')).click();
    await settle();
    await pick(potency, 'fr-select button', '+1');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'etchRune', id: SWORD, rune: { type: 'fundamental', rune: 'potency', grade: 1 } },
    });
  });

  it('offers a weapon its potency and striking runes at every grade, and nothing on gear that takes no runes', async () => {
    const section = await openInventory();
    const sword = row(section, 'Longsword');
    expect(sword.textContent).toContain('Striking rune on Longsword');
    expect(sword.textContent).not.toContain('Resilient rune on Longsword');
    expect(row(section, 'Backpack').textContent).not.toContain('Runes on');
    const striking = field(sword, 'Striking rune on Longsword');
    present(striking.querySelector<HTMLElement>('button')).click();
    await settle();
    present(striking.querySelector<HTMLElement>('fr-select button')).click();
    await settle();
    await expect(optionsShown()).resolves.toStrictEqual([
      'None',
      'Striking',
      'Greater Striking',
      'Major Striking',
      'Mythic Striking',
    ]);
  });

  it('asks for a potency rune before a property rune', async () => {
    const section = await openInventory();
    expect(row(section, 'Longsword').textContent).toContain('Etch a higher potency rune');
  });

  it('names the sword with its runes once etched, and erases a property rune', async () => {
    const section = await openInventory();
    await etchedAs(section, RUNED);
    const sword = await vi.waitFor(async () => {
      await settle();
      return row(section, '+1 Flaming Longsword');
    });
    button(sword, 'Erase Flaming from').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 4,
      patch: { field: 'eraseRune', id: SWORD, rune: { type: 'property', rune: runeFixtureId(RuneFixture.Flaming) } },
    });
  });

  it('moves a rune onto another item of the same kind, and shows a refusal in the form', async () => {
    const section = await openInventory();
    await etchedAs(section, RUNED_PAIR);
    const move = await vi.waitFor(async () => {
      await settle();
      return present(row(section, '+1 Flaming Longsword').querySelector<HTMLElement>('pio-rune-move fr-async-form'));
    });
    const [rune, onto] = move.querySelectorAll<HTMLElement>('fr-select-field');
    await pick(present(rune), 'fr-select button', 'Flaming');
    await pick(present(onto), 'fr-select button', 'Longsword');
    button(move, 'Move').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 4,
      patch: {
        field: 'transferRune',
        id: SWORD,
        to: SPARE,
        rune: { type: 'property', rune: runeFixtureId(RuneFixture.Flaming) },
      },
    });
    sent.flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['patch', 'rune'], message: { key: 'character.validation.runeEtched' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await vi.waitFor(async () => {
      await settle();
      expect(move.textContent).toContain('This item already has that rune.');
    });
  });
});
