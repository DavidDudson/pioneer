import { HttpTestingController } from '@angular/common/http/testing';
import type { TestRequest } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId } from '@pioneer/character/domain';
import { ITEM_FIXTURE_FILES, ItemFixture, itemFixtureId, KIT_FIXTURE_FILES } from '@pioneer/character/domain/testing';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { expect, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../character.routes';
import { prebuildServerStateTesting, provideServerStateTesting } from './provide-server-state-testing';
import { answerPacksRead, answerPlayRead, answerRuleLimitsRead, answerVariantRulesRead } from './sheet-page-harness';

export const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');
const BACKPACK = '11111111-1111-4111-8111-111111111111';
export const ROPE = '33333333-3333-4333-8333-333333333333';
export const SWORD = '44444444-4444-4444-8444-444444444444';
export const CLOAK = '77777777-7777-4777-8777-777777777777';
export const LISTBOX_PX = 400;
export const OPTION_PX = 44;

/** Valeros with a worn backpack holding his climbing rope, a longsword in hand, an invested cloak, and some gold. */
export const VALEROS = {
  id,
  version: 3,
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  name: 'Valeros',
  level: 1,
  build: { choices: { ancestry: contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human')) } },
  inventory: {
    items: [
      { id: BACKPACK, item: itemFixtureId(ItemFixture.Backpack), quantity: 1, carry: { state: 'worn' } },
      { id: ROPE, item: itemFixtureId(ItemFixture.Rope), quantity: 2, container: BACKPACK, name: 'Climbing rope' },
      { id: SWORD, item: itemFixtureId(ItemFixture.Longsword), quantity: 1, carry: { state: 'held', hands: 1 } },
      { id: CLOAK, item: itemFixtureId(ItemFixture.Cloak), quantity: 1, carry: { state: 'worn' }, invested: true },
    ],
    coins: { pp: 0, gp: 15, sp: 0, cp: 0 },
  },
  createdAt: '2026-10-07T10:00:00.000Z',
  updatedAt: '2026-10-07T10:00:00.000Z',
};

export function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

export async function settle(): Promise<void> {
  await TestBed.inject(ApplicationRef).whenStable();
}

/** The packs the sheet loads in these tests: the item fixtures and kits of them. */
export const SHEET_PACKS = [ITEM_FIXTURE_FILES, KIT_FIXTURE_FILES];

/** Answers the sheet's reads of Valeros's play state, packs and variant rules, none of them changed. */
async function answerServerState(): Promise<void> {
  await answerPlayRead();
  await answerPacksRead();
  await answerVariantRulesRead();
  await answerRuleLimitsRead();
}

/** Opens Valeros's sheet at `url` with the item fixtures and kits loaded, once his character has loaded. */
async function openSheet(url: string): Promise<HTMLElement> {
  await prebuildServerStateTesting(SHEET_PACKS);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(SHEET_PACKS),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  const host: unknown = harness.fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('The sheet did not render');
  }
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController)
      .expectOne(`/api/characters/${id}`)
      .flush({ character: VALEROS, slots: [], languages: { known: [], open: 0 } });
  });
  await answerServerState();
  return present(harness.routeNativeElement);
}

/** Opens Valeros's sheet with the item fixtures loaded and waits for the inventory to list his items. */
export async function openInventory(): Promise<HTMLElement> {
  const sheet = await openSheet(`/characters/${id}/exploration`);
  const section = present(sheet.querySelector<HTMLElement>('pio-inventory-section'));
  await vi.waitFor(async () => {
    await settle();
    expect(section.querySelectorAll('pio-inventory-row')).toHaveLength(VALEROS.inventory.items.length);
  });
  return section;
}

export function button(within: Element, label: string): HTMLElement {
  return present([...within.querySelectorAll<HTMLElement>('button')].find((each) => each.textContent.includes(label)));
}

/** The inline field whose label starts with `label`. */
export function field(within: Element, label: string): HTMLElement {
  return present(
    [...within.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim().startsWith(label) === true,
    ),
  );
}

/** The item row whose name starts with `name`. */
export function row(section: HTMLElement, name: string): HTMLElement {
  return present(
    [...section.querySelectorAll<HTMLElement>('pio-inventory-row')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim().startsWith(name) === true,
    ),
  );
}

/** Opens `target`'s editor, types `text` and presses Enter, which saves at once. */
export async function typeInto(target: HTMLElement, text: string): Promise<void> {
  present(target.querySelector<HTMLElement>('button')).click();
  await settle();
  const input = present(target.querySelector<HTMLInputElement>('input'));
  input.value = text;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  await settle();
}

/** Clicks `opener` in `target` and then the option labelled `label`. */
export async function pick(target: HTMLElement, opener: string, label: string): Promise<void> {
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

export async function patchSent(): Promise<TestRequest> {
  return vi.waitFor(() =>
    TestBed.inject(HttpTestingController).expectOne({ method: 'PATCH', url: `/api/characters/${id}` }),
  );
}

/** Opens Valeros's sheet, with `query` in the URL when given, and waits for the shop to list what it offers. */
export async function openShop(query = ''): Promise<HTMLElement> {
  const sheet = await openSheet(`/characters/${id}/downtime${query}`);
  const shop = present(sheet.querySelector<HTMLElement>('pio-shop'));
  await vi.waitFor(async () => {
    await settle();
    expect(shop.querySelectorAll('pio-shop-offers fr-toggle-button').length).toBeGreaterThan(0);
  });
  return shop;
}
