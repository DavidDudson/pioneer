import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { EntryEndingsView } from './entry-endings.component';
import type { PreviewEnding } from './entry-preview';
import { CLUMSY_ENDINGS_PREVIEW } from './entry-preview.fixtures';

const ENDINGS: readonly PreviewEnding[] = CLUMSY_ENDINGS_PREVIEW.endings ?? [];

function render(endings: readonly PreviewEnding[]): ComponentFixture<EntryEndingsView> {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting(), provideRouter([])] });
  const fixture = TestBed.createComponent(EntryEndingsView);
  fixture.componentRef.setInput('endings', endings);
  fixture.detectChanges();
  return fixture;
}

function textOf(fixture: ComponentFixture<EntryEndingsView>): string {
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(EntryEndingsView, () => {
  it('words each ending under its kind, with its rule text', () => {
    const text = textOf(render(ENDINGS));

    expect(text).toContain('How this character can end it');
    expect(text).toContain('Happens by itself');
    expect(text).toContain('drops by 1');
    expect(text).toContain('Help from others');
  });

  it('shows the DC of a check', () => {
    expect(textOf(render(ENDINGS))).toContain('DC 12');
  });

  it('names the action that ends it', () => {
    expect(textOf(render(ENDINGS))).toContain('Steady');
  });

  it('names what the character has that eases it', () => {
    const text = textOf(render(ENDINGS));

    expect(text).toContain('You have:');
    expect(text).toContain('Treat Condition');
  });

  it('shows no list of held entries for an ending the character has nothing for', () => {
    const text = textOf(render(ENDINGS.slice(0, 1)));

    expect(text).not.toContain('You have:');
  });
});
