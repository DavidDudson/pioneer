import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { LinkTarget } from '@pioneer/frontier';
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

function renderFetching(load: () => Promise<EntryPreview | undefined>): ComponentFixture<RichTextView> {
  TestBed.configureTestingModule({
    providers: [
      provideRichTextTesting(),
      provideEntryPreviews({
        preview: (): undefined => undefined,
        load,
        target: (): LinkTarget => ['/content', 'spell', 'fireball'],
      }),
    ],
  });
  const fixture = TestBed.createComponent(RichTextView);
  fixture.componentRef.setInput('text', REFERENCE);
  fixture.detectChanges();
  return fixture;
}

async function focus(fixture: ComponentFixture<RichTextView>): Promise<void> {
  tabStop(fixture)?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(() => {
    fixture.detectChanges();
    expect(card()).not.toBeNull();
  });
}

describe('content preview', () => {
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

  describe('an entry the page fetches on first open', () => {
    it('fetches nothing until the card opens, then shows a skeleton and the entry with a link to it', async () => {
      const { promise, resolve: settle } = Promise.withResolvers<EntryPreview | undefined>();
      const load = vi.fn<() => Promise<EntryPreview | undefined>>(async () => promise);
      const fixture = renderFetching(load);
      expect(load).not.toHaveBeenCalled();
      await focus(fixture);
      expect(card()?.querySelector('fr-skeleton')).not.toBeNull();
      settle(FIREBALL_PREVIEW);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('A roaring blast of fire');
      });
      expect(card()?.querySelector('a')?.getAttribute('href')).toBe('/content/spell/fireball');
    });

    it('says in the card when the fetch fails, and tries again when it reopens', async () => {
      const load = vi
        .fn<() => Promise<EntryPreview | undefined>>()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValueOnce(FIREBALL_PREVIEW);
      const fixture = renderFetching(load);
      await focus(fixture);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('could not be loaded');
      });
      const element = tabStop(fixture);
      element?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()).toBeNull();
      });
      await focus(fixture);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('A roaring blast of fire');
      });
      expect(load).toHaveBeenCalledTimes(2);
    });

    it('says so when the entry does not exist', async () => {
      const fixture = renderFetching(async () => undefined);
      await focus(fixture);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('not in the content');
      });
    });
  });
});
