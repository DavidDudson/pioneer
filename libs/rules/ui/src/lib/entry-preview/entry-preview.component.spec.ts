import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewView } from './entry-preview.component';
import { CLUMSY_PREVIEW, FIREBALL_PREVIEW } from './entry-preview.fixtures';

function render(preview: EntryPreview): HTMLElement {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting()] });
  const fixture: ComponentFixture<EntryPreviewView> = TestBed.createComponent(EntryPreviewView);
  fixture.componentRef.setInput('preview', preview);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe(EntryPreviewView, () => {
  it('shows the value beside the name and the statistics the entry changes with it applied', () => {
    const text = render(CLUMSY_PREVIEW).textContent;
    expect(text).toMatch(/Clumsy\s*2/u);
    expect(text).toContain('Changes for this character');
    expect(text).toContain('Armor Class -2 status');
    expect(text).toContain('Reflex -2 status');
  });

  it('says so when the entry changes no statistic', () => {
    expect(render({ ...CLUMSY_PREVIEW, effects: [] }).textContent).toContain('Changes no statistic.');
  });

  it('shows no effects for an entry the character does not have', () => {
    const text = render(FIREBALL_PREVIEW).textContent;
    expect(text).not.toContain('Changes for this character');
    expect(text).not.toContain('Changes no statistic.');
  });
});
