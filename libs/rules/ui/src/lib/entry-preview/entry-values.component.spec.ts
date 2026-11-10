import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import type { EntryPreview } from './entry-preview';
import { CLUMSY_FORMULA_PREVIEW, CLUMSY_NOT_HELD_PREVIEW, DYING_STAGES_PREVIEW } from './entry-preview.fixtures';
import { EntryValuesView } from './entry-values.component';

function render(preview: EntryPreview): ComponentFixture<EntryValuesView> {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting(), provideRouter([])] });
  const fixture = TestBed.createComponent(EntryValuesView);
  fixture.componentRef.setInput('values', preview.values);
  fixture.componentRef.setInput('current', preview.value);
  fixture.detectChanges();
  return fixture;
}

function element(fixture: ComponentFixture<EntryValuesView>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

describe(EntryValuesView, () => {
  it('lists every stage of a staged condition', () => {
    const items = element(render(DYING_STAGES_PREVIEW)).querySelectorAll('fr-list-item');

    expect(items).toHaveLength(4);
    expect(items[3]?.textContent).toContain('You die.');
  });

  it('marks the stage held as current and no other', () => {
    const marked = element(render(DYING_STAGES_PREVIEW)).querySelectorAll('[aria-current="true"]');

    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toContain('recovery check DC is higher');
  });

  it('says the rule once for a formula condition, with no list', () => {
    const root = element(render(CLUMSY_FORMULA_PREVIEW));

    expect(root.textContent).toContain('equal to the value');
    expect(root.querySelector('fr-list')).toBeNull();
  });

  it('is hidden when the condition says nothing of its values', () => {
    const fixture = render(CLUMSY_NOT_HELD_PREVIEW);

    expect(element(fixture).hidden).toBe(true);
  });
});
