import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import type { SlotFilter } from '../sheet-slot-filter';
import { SheetSlotFilterPanel, SPELL_FILTER_MESSAGES } from './sheet-slot-filter-panel.component';

function slotFilter(preset: boolean, everything = false): SlotFilter {
  return {
    state: signal(new Map()),
    counts: signal([]),
    preset: signal(preset),
    everything: signal(everything),
    hidden: signal(new Set<string>()),
    apply: vi.fn<SlotFilter['apply']>(async () => {}),
    showEverything: vi.fn<SlotFilter['showEverything']>(async () => {}),
  };
}

async function render(filter: SlotFilter | undefined): Promise<ComponentFixture<SheetSlotFilterPanel>> {
  TestBed.configureTestingModule({
    providers: [provideI18n({ en: async () => frontierMessages })],
  });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', {
    merge: true,
  });
  const fixture = TestBed.createComponent(SheetSlotFilterPanel);
  fixture.componentRef.setInput('filter', filter);
  fixture.componentRef.setInput('messages', SPELL_FILTER_MESSAGES);
  await fixture.whenStable();
  return fixture;
}

const textOf = (fixture: ComponentFixture<SheetSlotFilterPanel>): string =>
  (fixture.nativeElement as HTMLElement).textContent;

describe(SheetSlotFilterPanel, () => {
  it('shows nothing where the pickers are not filtered', async () => {
    const fixture = await render(undefined);

    expect(textOf(fixture).trim()).toBe('');
  });

  it('says what Available to you keeps while the preset is in force', async () => {
    const fixture = await render(slotFilter(true));

    expect(textOf(fixture)).toContain(en.sheet.prepared.available);
  });

  it('drops that line once the player has their own filters', async () => {
    const fixture = await render(slotFilter(false));

    expect(textOf(fixture)).not.toContain(en.sheet.prepared.available);
  });

  it('shows every spell from the toggle', async () => {
    const filter = slotFilter(true);
    const fixture = await render(filter);

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('fr-toggle-button button');
    toggle?.click();
    await fixture.whenStable();

    expect(textOf(fixture)).toContain(en.sheet.prepared.everything);
    expect(filter.showEverything).toHaveBeenCalledWith(true);
  });
});
