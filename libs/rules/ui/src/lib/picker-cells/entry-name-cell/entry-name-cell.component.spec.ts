import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

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
});
