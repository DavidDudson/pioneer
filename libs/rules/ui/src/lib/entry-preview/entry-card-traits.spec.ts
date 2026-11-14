import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContentId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { HELD_TRAIT_PREVIEWS } from '../trait-chip/trait-chip.fixtures';
import { ContentPreview } from './content-preview.component';
import { provideEntryPreviews } from './entry-preview';
import type { EntryPreview, EntryPreviews } from './entry-preview';
import { EntryPreviewView } from './entry-preview.component';
import { FIREBALL, FIREBALL_PREVIEW } from './entry-preview.fixtures';

/** The page holds the feat card and the trait cards its chips open. */
const PREVIEWS: EntryPreviews = {
  preview: (id): EntryPreview | undefined => (id === FIREBALL ? FIREBALL_PREVIEW : HELD_TRAIT_PREVIEWS.preview(id)),
};

// A host is the only way to put a card's trigger inside a hover card.
@Component({
  selector: 'pio-entry-card-traits-host',
  imports: [ContentPreview],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `<pio-content-preview [entry]="entry"><span id="outer" tabindex="0">Fireball</span></pio-content-preview>`,
})
class Host {
  protected readonly entry = ContentId.parse(FIREBALL);
}

const cards = (): readonly HTMLElement[] => [...document.querySelectorAll<HTMLElement>('[role="tooltip"]')];

/** The chip tab stop named `name`, inside `root`. */
function chip(root: ParentNode | undefined, name: string): HTMLElement | undefined {
  return [...(root?.querySelectorAll<HTMLElement>('[tabindex="0"]') ?? [])].find(
    (each) => each.textContent.trim() === name,
  );
}

function focus(element: HTMLElement | null | undefined): void {
  element?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

describe('the entry card', () => {
  it('shows each trait as a chip that opens the trait card', async () => {
    TestBed.configureTestingModule({
      providers: [provideRichTextTesting(), provideRouter([]), provideEntryPreviews(PREVIEWS)],
    });
    const fixture: ComponentFixture<EntryPreviewView> = TestBed.createComponent(EntryPreviewView);
    fixture.componentRef.setInput('preview', FIREBALL_PREVIEW);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('pio-trait-chip')).toHaveLength(FIREBALL_PREVIEW.traits.length);
    focus(chip(root, 'Fire'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards().map((each) => each.textContent)).toStrictEqual([expect.stringContaining('deal fire damage')]);
    });
  });

  it('opens a trait card from inside a hovered feat card, and Escape closes the trait card first', async () => {
    TestBed.configureTestingModule({
      providers: [provideRichTextTesting(), provideRouter([]), provideEntryPreviews(PREVIEWS)],
    });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    focus((fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('#outer'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(1);
    });
    const trait = chip(cards()[0], 'Fire');
    focus(trait);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(2);
    });
    expect(cards()[1]?.textContent).toContain('deal fire damage');

    trait?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(cards()).toHaveLength(1);
    });
    expect(cards()[0]?.textContent).toContain('A roaring blast of fire');
  });
});
