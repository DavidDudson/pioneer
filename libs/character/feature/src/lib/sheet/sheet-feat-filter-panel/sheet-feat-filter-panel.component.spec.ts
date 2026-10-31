import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { rulesMessages } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import type { FeatSlotFilter } from '../sheet-feat-slot-filter';
import { SheetFeatFilterPanel } from './sheet-feat-filter-panel.component';

function slotFilter(preset: boolean, everything = false): FeatSlotFilter {
  return {
    state: signal(new Map()),
    counts: signal([]),
    preset: signal(preset),
    everything: signal(everything),
    hidden: signal(new Set<string>()),
    apply: vi.fn<FeatSlotFilter['apply']>(async () => {}),
    showEverything: vi.fn<FeatSlotFilter['showEverything']>(async () => {}),
  };
}

async function render(filter: FeatSlotFilter | undefined): Promise<ComponentFixture<SheetFeatFilterPanel>> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => frontierMessages })] });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });
  const fixture = TestBed.createComponent(SheetFeatFilterPanel);
  fixture.componentRef.setInput('filter', filter);
  await fixture.whenStable();
  return fixture;
}

const textOf = (fixture: ComponentFixture<SheetFeatFilterPanel>): string =>
  (fixture.nativeElement as HTMLElement).textContent;

describe(SheetFeatFilterPanel, () => {
  it('shows nothing where the pickers are not filtered', async () => {
    const fixture = await render(undefined);

    expect(textOf(fixture).trim()).toBe('');
  });

  it('says what Available to you keeps while the preset is in force', async () => {
    const fixture = await render(slotFilter(true));

    expect(textOf(fixture)).toContain(en.sheet.feats.available);
  });

  it('drops that line once the player has their own filters', async () => {
    const fixture = await render(slotFilter(false));

    expect(textOf(fixture)).not.toContain(en.sheet.feats.available);
  });

  it('shows every feat from the toggle', async () => {
    const filter = slotFilter(true);
    const fixture = await render(filter);

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('fr-toggle-button button');
    toggle?.click();
    await fixture.whenStable();

    expect(textOf(fixture)).toContain(en.sheet.feats.everything);
    expect(filter.showEverything).toHaveBeenCalledWith(true);
  });
});
