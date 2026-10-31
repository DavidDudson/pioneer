import type { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { ContentId, FocusPoints, SpellRank } from '@pioneer/rules/sdk';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import { ActionRow } from '../actions/action-row.component';
import { FocusSpellsView } from '../focus-spells/focus-spells.component';
import { InventoryView } from '../inventory/inventory.component';
import { KitContents } from '../shop/kit-contents/kit-contents.component';
import { kitLine } from '../shop/kit-contents/kit-contents.fixtures';
import { ShopOffersView } from '../shop/shop-offers.component';
import { SpellAccessListView } from '../spell-access/spell-access-list.component';
import { STANDING_ACTIONS } from '../testing/action-fixtures';
import { FIGHTER_INVENTORY } from '../testing/inventory-fixtures';
import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { LONGSWORD } from '../testing/shop-fixtures';
import { provideEntryPreviews } from './entry-preview';
import { FIREBALL, FIREBALL_PREVIEW } from './entry-preview.fixtures';

const SPELL = ContentId.parse(FIREBALL);

interface Row<Host> {
  readonly name: string;
  readonly component: Type<Host>;
  readonly inputs: Readonly<Record<string, unknown>>;
}

const ROWS: readonly Row<unknown>[] = [
  {
    name: 'focus spell',
    component: FocusSpellsView,
    inputs: {
      focus: {
        rank: SpellRank.parse(1),
        pool: FocusPoints.parse(1),
        entries: [
          {
            key: 'bard-focus',
            tradition: 'occult',
            spells: [{ key: 'fireball', id: SPELL, name: 'Fireball', cantrip: false }],
          },
        ],
      },
    },
  },
  {
    name: 'spell access',
    component: SpellAccessListView,
    inputs: { lines: [{ spell: SPELL, name: 'Fireball' }] },
  },
  { name: 'inventory item', component: InventoryView, inputs: { groups: FIGHTER_INVENTORY } },
  { name: 'shop offer', component: ShopOffersView, inputs: { offers: [LONGSWORD] } },
  {
    name: 'action',
    component: ActionRow,
    inputs: { action: { line: STANDING_ACTIONS[0], detail: '', reasons: [], conditions: [] } },
  },
  { name: 'kit item', component: KitContents, inputs: { lines: [kitLine('Longsword', 1)] } },
];

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function focusName<Host>(fixture: ComponentFixture<Host>): void {
  (fixture.nativeElement as HTMLElement)
    .querySelector('[tabindex="0"]')
    ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

async function render<Host>({ component, inputs }: Row<Host>, known: boolean): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideTanStackQuery(new QueryClient()),
      provideEntryPreviews({
        preview: (): typeof FIREBALL_PREVIEW | undefined => (known ? FIREBALL_PREVIEW : undefined),
      }),
    ],
  });
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  await fixture.whenStable();
  return fixture;
}

describe('rows that preview their entry', () => {
  it.each(ROWS)('opens the preview when a $name is focused', async (row) => {
    const fixture = await render(row, true);
    focusName(fixture);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(card()?.textContent).toContain('A roaring blast of fire');
    });
  });

  it.each(ROWS)('leaves a $name without a preview as it was', async (row) => {
    const fixture = await render(row, false);
    focusName(fixture);
    fixture.detectChanges();
    expect(card()).toBeNull();
  });
});
