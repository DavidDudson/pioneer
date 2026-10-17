import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { provideEntryPreviews } from '../../entry-preview/entry-preview';
import { FIREBALL, FIREBALL_PREVIEWS } from '../../entry-preview/entry-preview.fixtures';
import { provideRulesUiI18nTesting } from '../../testing/provide-rich-text-testing';
import { EntryNameCell } from './entry-name-cell.component';

describe(EntryNameCell, () => {
  it('links the name to the entry', async () => {
    TestBed.configureTestingModule({ providers: [provideRulesUiI18nTesting(), provideRouter([])] });
    const fixture = TestBed.createComponent(EntryNameCell);
    fixture.componentRef.setInput('name', 'Power Attack');
    fixture.componentRef.setInput('to', ['/content', 'feat', 'power-attack']);
    await fixture.whenStable();
    const anchor = (fixture.nativeElement as HTMLElement).querySelector('a');
    expect(anchor?.textContent.trim()).toBe('Power Attack');
    expect(anchor?.getAttribute('href')).toBe('/content/feat/power-attack');
  });

  it('opens a preview of the entry from its link', async () => {
    TestBed.configureTestingModule({
      providers: [provideRulesUiI18nTesting(), provideRouter([]), provideEntryPreviews(FIREBALL_PREVIEWS)],
    });
    const fixture = TestBed.createComponent(EntryNameCell);
    fixture.componentRef.setInput('name', 'Fireball');
    fixture.componentRef.setInput('to', ['/content', 'spell', 'fireball']);
    fixture.componentRef.setInput('entry', FIREBALL);
    await fixture.whenStable();
    (fixture.nativeElement as HTMLElement)
      .querySelector('a')
      ?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('A roaring blast of fire');
    });
  });

  it('makes a name with no link a tab stop when it can be previewed', async () => {
    TestBed.configureTestingModule({
      providers: [provideRulesUiI18nTesting(), provideEntryPreviews(FIREBALL_PREVIEWS)],
    });
    const fixture = TestBed.createComponent(EntryNameCell);
    fixture.componentRef.setInput('name', 'Fireball');
    fixture.componentRef.setInput('entry', FIREBALL);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[tabindex="0"]')?.textContent.trim()).toBe('Fireball');
  });
});
