import { HttpTestingController } from '@angular/common/http/testing';
import type { TestRequest } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../../../character.routes';
import { provideServerStateTesting } from '../../../testing/provide-server-state-testing';

const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');
const BACKPACK = '11111111-1111-4111-8111-111111111111';
const ROPE = '33333333-3333-4333-8333-333333333333';
const SWORD = '44444444-4444-4444-8444-444444444444';
const LISTBOX_PX = 400;
const OPTION_PX = 44;

/** Valeros with a worn backpack holding his climbing rope, a longsword in hand, and some gold. */
const VALEROS = {
  id,
  version: 3,
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  name: 'Valeros',
  level: 1,
  build: { choices: { ancestry: contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human')) } },
  inventory: {
    items: [
      { id: BACKPACK, item: itemFixtureId(ItemFixture.Backpack), quantity: 1 },
      { id: ROPE, item: itemFixtureId(ItemFixture.Rope), quantity: 2, container: BACKPACK, name: 'Climbing rope' },
      { id: SWORD, item: itemFixtureId(ItemFixture.Longsword), quantity: 1 },
    ],
    coins: { pp: 0, gp: 15, sp: 0, cp: 0 },
  },
  createdAt: '2026-10-07T10:00:00.000Z',
  updatedAt: '2026-10-07T10:00:00.000Z',
};

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

/** Opens Valeros's sheet with the item fixtures loaded and waits for the inventory to list his items. */
async function openInventory(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting([ITEM_FIXTURE_FILES]),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/characters/${id}`);
  const host = harness.fixture.nativeElement as HTMLElement;
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController).expectOne(`/api/characters/${id}`).flush({ character: VALEROS, slots: [] });
  });
  const section = present(present(harness.routeNativeElement).querySelector<HTMLElement>('pio-inventory-section'));
  await vi.waitFor(async () => {
    await settle();
    expect(section.querySelectorAll('pio-inventory-row')).toHaveLength(3);
  });
  return section;
}

function button(within: Element, label: string): HTMLElement {
  return present([...within.querySelectorAll<HTMLElement>('button')].find((each) => each.textContent.includes(label)));
}

/** The inline field whose label starts with `label`. */
function field(within: Element, label: string): HTMLElement {
  return present(
    [...within.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim().startsWith(label) === true,
    ),
  );
}

/** The item row whose name starts with `name`. */
function row(section: HTMLElement, name: string): HTMLElement {
  return present(
    [...section.querySelectorAll<HTMLElement>('pio-inventory-row')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim().startsWith(name) === true,
    ),
  );
}

/** Opens `target`'s editor, types `text` and presses Enter, which saves at once. */
async function typeInto(target: HTMLElement, text: string): Promise<void> {
  present(target.querySelector<HTMLElement>('button')).click();
  await settle();
  const input = present(target.querySelector<HTMLInputElement>('input'));
  input.value = text;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await settle();
}

/** Clicks `opener` in `target` and then the option labelled `label`. */
async function pick(target: HTMLElement, opener: string, label: string): Promise<void> {
  present(target.querySelector<HTMLElement>(opener)).click();
  await settle();
  const option = await vi.waitFor(() =>
    present(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((each) => each.textContent.trim() === label),
    ),
  );
  option.click();
  await settle();
}

async function patchSent(): Promise<TestRequest> {
  return vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
}

describe('InventorySection', () => {
  it('lists the backpack worn with the rope inside it, the sword held, and the coins the character has', async () => {
    const section = await openInventory();
    const headings = [...section.querySelectorAll('fr-heading')].map((heading) => heading.textContent.trim());
    expect(headings).toContain('Held');
    const rope = present(row(section, 'Backpack').querySelector('pio-inventory-row'));
    expect(rope.textContent).toContain('Climbing rope');
    expect(rope.textContent).toContain('× 2');
    expect(field(section, 'Gold (gp)').textContent).toContain('15');
    expect(field(section, 'Silver (sp)').textContent).toContain('0');
  });

  it('removes a plain item on the first press', async () => {
    const section = await openInventory();
    button(row(section, 'Longsword'), 'Remove Longsword').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'removeItem', id: SWORD },
    });
  });

  it('asks again before removing an item with the player’s name, which adding it back would lose', async () => {
    const section = await openInventory();
    const rope = row(section, 'Climbing rope');
    button(rope, 'Remove Climbing rope').click();
    await settle();
    TestBed.inject(HttpTestingController).expectNone({ method: 'PATCH', url: `/api/characters/${id}` });
    button(rope, 'Remove Climbing rope? Press again').click();
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'removeItem', id: ROPE },
    });
  });

  it('saves a quantity as setItemQuantity', async () => {
    const section = await openInventory();
    await typeInto(field(row(section, 'Longsword'), 'Quantity of Longsword'), '3');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'setItemQuantity', id: SWORD, quantity: 3 },
    });
  });

  it('clears a name back to the content’s by sending no name', async () => {
    const section = await openInventory();
    await typeInto(field(row(section, 'Climbing rope'), 'Your name for Climbing rope'), '');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'renameItem', id: ROPE },
    });
  });

  it('takes an item out of its container by sending no container, and shows a refusal in the field', async () => {
    const section = await openInventory();
    const place = field(row(section, 'Climbing rope'), 'Where Climbing rope is');
    present(place.querySelector<HTMLElement>('button')).click();
    await settle();
    await pick(place, '[frInlineEditor] button, button[frInlineEditor], fr-select button', 'Carried loose');
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({ expectedVersion: 3, patch: { field: 'moveItem', id: ROPE } });
    request.flush(
      {
        type: 'validation',
        title: 'Validation failed',
        status: 422,
        message: { key: 'problem.validation' },
        issues: [{ path: ['patch', 'id'], message: { key: 'character.validation.itemNotFound' } }],
      },
      { status: 422, statusText: 'Unprocessable Content' },
    );
    await vi.waitFor(async () => {
      await settle();
      expect(place.textContent).toContain('This character no longer has that item.');
    });
  });

  it('saves a coin as the whole purse with that coin changed', async () => {
    const section = await openInventory();
    await typeInto(field(section, 'Silver (sp)'), '7');
    const sent = await patchSent();
    expect(sent.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'setCoins', coins: { pp: 0, gp: 15, sp: 7, cp: 0 } },
    });
  });

  it('adds a picked item loose, sending no container, then clears the form', async () => {
    const section = await openInventory();
    const form = present(section.querySelector<HTMLElement>('pio-add-item'));
    // Nothing is laid out in jsdom: give the virtualised listbox a height and each option a row, as frontier's own specs do.
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(LISTBOX_PX);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      DOMRect.fromRect({ width: LISTBOX_PX, height: OPTION_PX }),
    );
    onTestFinished(() => {
      vi.restoreAllMocks();
    });
    const search = present(form.querySelector<HTMLInputElement>('input[role="combobox"]'));
    search.value = 'Dia';
    search.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    const diamond = await vi.waitFor(
      () =>
        present(
          [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
            (each) => each.textContent.trim() === 'Diamond',
          ),
        ),
      { timeout: 3000 },
    );
    diamond.click();
    await settle();
    button(form, 'Add').click();
    const request = await patchSent();
    expect(request.request.body).toStrictEqual({
      expectedVersion: 3,
      patch: { field: 'addItem', item: itemFixtureId(ItemFixture.Diamond), quantity: 1 },
    });
    request.flush({ character: { ...VALEROS, version: 4 }, slots: [] });
    await vi.waitFor(async () => {
      await settle();
      expect(present(form.querySelector<HTMLInputElement>('input[role="combobox"]')).value).toBe('');
    });
  });
});
