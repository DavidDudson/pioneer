import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { RichText } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { RichTextView } from '../rich-text/rich-text.component';
import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { provideEntryPreviews } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import { FIREBALL, FIREBALL_PREVIEW } from './entry-preview.fixtures';

const REFERENCE = RichText.parse([{ type: 'paragraph', content: [{ type: 'ref', id: FIREBALL, label: 'Fireball' }] }]);

function render(known: boolean): ComponentFixture<RichTextView> {
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideEntryPreviews({
        preview: (id: ContentId): EntryPreview | undefined => (known && id === FIREBALL ? FIREBALL_PREVIEW : undefined),
      }),
    ],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', REFERENCE);
  fixture.detectChanges();
  return fixture;
}

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function tabStop(fixture: ComponentFixture<RichTextView>): Element | null {
  return (fixture.nativeElement as HTMLElement).querySelector('[tabindex="0"]');
}

/** Focuses the reference and waits for the card, which loads on first open. */
async function open(fixture: ComponentFixture<RichTextView>): Promise<void> {
  tabStop(fixture)?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(card()?.textContent).toContain('A roaring blast of fire');
  });
}

describe('entry hover', () => {
  it('opens a preview of the entry when its reference is focused', async () => {
    const fixture = render(true);
    await open(fixture);
    expect(card()?.textContent).toContain('Fireball');
    expect(card()?.textContent).toContain('Level 3');
    expect(card()?.textContent).toContain('concentrate');
    expect(card()?.textContent).toContain('Player Core');
  });

  it('shows only the opening of the description', async () => {
    const fixture = render(true);
    await open(fixture);
    expect(card()?.textContent).not.toContain('Heightened');
  });

  it('leaves a reference to an unknown entry as plain text', () => {
    const fixture = render(false);
    expect(tabStop(fixture)).toBeNull();
    expect(card()).toBeNull();
  });
});
