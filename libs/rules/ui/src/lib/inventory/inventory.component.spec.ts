import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { FIGHTER_INVENTORY } from '../testing/inventory-fixtures';
import { provideRulesUiI18nTesting } from '../testing/provide-rich-text-testing';
import type { InventoryGroup } from './inventory-line';
import { InventoryView } from './inventory.component';

async function render(groups: readonly InventoryGroup[] | undefined): Promise<HTMLElement> {
  TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting()] });
  const fixture: ComponentFixture<InventoryView> = TestBed.createComponent(InventoryView);
  fixture.componentRef.setInput('groups', groups);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

/** Each line's own texts, not those of what it holds. */
function lineTexts(row: Element): string[] {
  return [...row.querySelectorAll('fr-text')]
    .filter((part) => part.closest('pio-inventory-row') === row)
    .map((part) => part.textContent.trim());
}

function rows(host: HTMLElement): string[][] {
  return [...host.querySelectorAll('pio-inventory-row')].map((row) => lineTexts(row));
}

describe(InventoryView, () => {
  it('groups items under worn, held, stowed and dropped', async () => {
    const host = await render(FIGHTER_INVENTORY);
    const headings = [...host.querySelectorAll('fr-heading')].map((heading) => heading.textContent.trim());
    expect(headings).toStrictEqual(['Worn', 'Held', 'Stowed', 'Dropped']);
  });

  it('shows each item with how many and its Bulk, the rules way', async () => {
    const shown = rows(await render(FIGHTER_INVENTORY));
    expect(shown[0]).toStrictEqual(['Leather Armor', '× 1', 'Bulk 1']);
    expect(shown[2]).toStrictEqual(['Backpack', '× 1', 'Bulk —']);
    expect(shown[3]).toStrictEqual(['Climbing rope', '(Rope)', '× 1', 'Bulk L']);
  });

  it('says how many hands a held item takes, and marks an invested one', async () => {
    const shown = rows(await render(FIGHTER_INVENTORY));
    expect(shown[1]).toStrictEqual(['Cloak of Elvenkind', '× 1', 'Invested', 'Bulk L']);
    expect(shown.find(([name]) => name === 'Longsword')).toStrictEqual(['Longsword', '× 1', 'in 1 hand', 'Bulk 1']);
  });

  it('lists what a container holds beneath it, nested as deep as it goes', async () => {
    const host = await render(FIGHTER_INVENTORY);
    // Only the backpack holds anything, so every nested row is inside it.
    const nested = [...host.querySelectorAll('pio-inventory-row pio-inventory-row')];
    const inside = nested.map((row) => lineTexts(row).at(0));
    expect(inside).toStrictEqual(['Climbing rope', 'Belt Pouch', 'Chalk']);
  });

  it('gives the Bulk of a batch with its size, as the rules price arrows', async () => {
    expect(rows(await render(FIGHTER_INVENTORY)).at(-3)).toStrictEqual(['Arrows', '× 50', 'Bulk L per 10']);
  });

  it('names an item whose content is gone as such, with no Bulk', async () => {
    expect(rows(await render(FIGHTER_INVENTORY)).at(-2)).toStrictEqual(['An item no loaded content has', '× 1']);
  });

  it('shows placeholders while loading, and an empty state with nothing carried', async () => {
    const loading = await render(undefined);
    expect(loading.querySelectorAll('fr-skeleton').length).toBeGreaterThan(0);
    TestBed.resetTestingModule();
    const empty = await render([]);
    expect(empty.textContent).toContain('Nothing carried yet.');
  });
});
