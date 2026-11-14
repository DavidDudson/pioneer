import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { EntryEaseOptionsView } from './entry-ease-options.component';
import type { PreviewEaseOption } from './entry-preview';
import { CLUMSY_ENDINGS_PREVIEW } from './entry-preview.fixtures';

const OPTIONS: readonly PreviewEaseOption[] = CLUMSY_ENDINGS_PREVIEW.easeOptions ?? [];

function render(options: readonly PreviewEaseOption[] | undefined): ComponentFixture<EntryEaseOptionsView> {
  TestBed.configureTestingModule({ providers: [provideRichTextTesting(), provideRouter([])] });
  const fixture = TestBed.createComponent(EntryEaseOptionsView);
  fixture.componentRef.setInput('options', options);
  fixture.detectChanges();
  return fixture;
}

function textOf(fixture: ComponentFixture<EntryEaseOptionsView>): string {
  return (fixture.nativeElement as HTMLElement).textContent;
}

describe(EntryEaseOptionsView, () => {
  it('names each option with what it does to the condition', () => {
    const text = textOf(render(OPTIONS));

    expect(text).toContain('What you have that eases it');
    expect(text).toContain('Treat Condition');
    expect(text).toContain('Lowers it by 1');
    expect(text).toContain('Removes it');
    expect(text).toContain('Counteracts it at rank 3');
  });

  it('shows how many are left of a counted option', () => {
    expect(textOf(render(OPTIONS))).toContain('2 left');
  });

  it('marks an option the character cannot use now', () => {
    expect(textOf(render(OPTIONS))).toContain('Not available now');
  });

  it('does not mark an option the character can use', () => {
    const usable = render(OPTIONS.slice(0, 1));

    expect(textOf(usable)).not.toContain('Not available now');
  });

  it('hides itself when the character has nothing to ease it', () => {
    const fixture = render(undefined);

    expect((fixture.nativeElement as HTMLElement).hidden).toBe(true);
  });
});
