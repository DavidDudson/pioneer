import { TestBed } from '@angular/core/testing';
import { BadgeTone } from '@pioneer/frontier';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../../entry-preview/entry-preview';
import { FIREBALL, FIREBALL_PREVIEWS } from '../../entry-preview/entry-preview.fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { renderCell } from '../../testing/render-cell';
import { ChipList } from './chip-list.component';

describe(ChipList, () => {
  it('shows a chip per trait, in order', async () => {
    const host = await renderCell(ChipList, {
      chips: [{ label: 'Fire' }, { label: 'Rare trait', tone: BadgeTone.Info }],
    });
    const chips = [...host.querySelectorAll('fr-badge')].map((chip) => chip.textContent.trim());
    expect(chips).toStrictEqual(['Fire', 'Rare trait']);
  });

  it('shows nothing for no traits', async () => {
    const host = await renderCell(ChipList, { chips: [] });
    expect(host.querySelectorAll('fr-badge')).toHaveLength(0);
  });

  it('opens a preview of the entry a chip names when it is focused', async () => {
    TestBed.configureTestingModule({
      providers: [provideRulesUiI18nTesting(), provideEntryPreviews(FIREBALL_PREVIEWS)],
    });
    const fixture = TestBed.createComponent(ChipList);
    fixture.componentRef.setInput('chips', [{ label: 'Fire', entry: FIREBALL }, { label: 'Plain' }]);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    const stops = host.querySelectorAll('[tabindex="0"]');
    expect(stops).toHaveLength(1);
    stops[0]?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('A roaring blast of fire');
    });
  });
});
