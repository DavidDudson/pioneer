import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import type { LinkTarget } from '@pioneer/frontier';
import { ConditionValue, ContentId, contentId, EntrySlug, PackId, RichText } from '@pioneer/rules/sdk';
import { describe, expect, it, vi } from 'vitest';

import { RichTextView } from '../rich-text/rich-text.component';
import { provideRichTextTesting } from '../testing/provide-rich-text-testing';
import { ContentPreview } from './content-preview.component';
import { provideEntryPreviews } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import { CLUMSY_NOT_HELD_PREVIEW, CLUMSY_PREVIEW, FIREBALL, FIREBALL_PREVIEW } from './entry-preview.fixtures';

const OTHER = ContentId.parse(contentId(PackId.parse('player-core'), EntrySlug.parse('condition:clumsy')));

// A host is the only way to change the entry of a card that is already open.
@Component({
  selector: 'pio-content-preview-host',
  imports: [ContentPreview],
  // oxlint-disable-next-line @angular-eslint/component-max-inline-declarations
  template: `<pio-content-preview [entry]="entry()"><span id="trigger" tabindex="0">Name</span></pio-content-preview>`,
})
class Host {
  public readonly entry = signal(ContentId.parse(FIREBALL));
}

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

/** Lets pending promises and the hover card's timers run. */
async function settled(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 50);
  });
}

function card(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[role="tooltip"]');
}

function tabStop(fixture: ComponentFixture<RichTextView>): Element | null {
  return (fixture.nativeElement as HTMLElement).querySelector('[tabindex="0"]');
}

/** The card's code loads on first open, which a cold CI worker can take longer over than `vi.waitFor`'s second. */
const CARD_LOAD_TIMEOUT = 5000;

/** Focuses the reference and waits for the card, which loads on first open. */
async function open(fixture: ComponentFixture<RichTextView>): Promise<void> {
  tabStop(fixture)?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  await vi.waitFor(
    () => {
      fixture.detectChanges();
      expect(card()?.textContent).toContain('A roaring blast of fire');
    },
    { timeout: CARD_LOAD_TIMEOUT },
  );
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
    expect(card()?.textContent).toContain('Concentrate');
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

    it('opens again while loading without fetching again', async () => {
      const { promise, resolve: settle } = Promise.withResolvers<EntryPreview | undefined>();
      const load = vi.fn<() => Promise<EntryPreview | undefined>>(async () => promise);
      const fixture = renderFetching(load);
      await focus(fixture);
      const element = tabStop(fixture);
      element?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      element?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await settled();
      settle(FIREBALL_PREVIEW);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('A roaring blast of fire');
      });
      expect(load).toHaveBeenCalledTimes(1);
    });

    it('fetches again when it reopens after the entry was not found', async () => {
      const load = vi
        .fn<() => Promise<EntryPreview | undefined>>()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(FIREBALL_PREVIEW);
      const fixture = renderFetching(load);
      await focus(fixture);
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('not in the content');
      });
      tabStop(fixture)?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
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

    it('never shows the result of an entry the card has since changed away from', async () => {
      const first = Promise.withResolvers<EntryPreview | undefined>();
      const load = vi
        .fn<(id: ContentId) => Promise<EntryPreview | undefined>>()
        .mockImplementationOnce(async () => first.promise)
        .mockResolvedValue(CLUMSY_PREVIEW);
      TestBed.configureTestingModule({
        providers: [provideRichTextTesting(), provideEntryPreviews({ preview: (): undefined => undefined, load })],
      });
      const fixture = TestBed.createComponent(Host);
      fixture.detectChanges();
      const element = (fixture.nativeElement as HTMLElement).querySelector('#trigger');
      element?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(load).toHaveBeenCalledTimes(1);
      });
      fixture.componentInstance.entry.set(OTHER);
      fixture.detectChanges();
      first.resolve(FIREBALL_PREVIEW);
      await settled();
      fixture.detectChanges();
      expect(card()?.textContent).not.toContain('A roaring blast of fire');
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

  describe('a mention of a valued condition that names a value', () => {
    const MENTION = RichText.parse([{ type: 'paragraph', content: [{ type: 'ref', id: OTHER, label: 'Clumsy 2' }] }]);
    const NOT_HELD: EntryPreview = {
      ...CLUMSY_NOT_HELD_PREVIEW,
      valued: true,
      endings: [
        {
          kind: 'check',
          text: RichText.parse([{ type: 'paragraph', content: [{ type: 'text', text: 'A flat check.' }] }]),
          dc: 10,
          dcByValue: true,
          against: [],
          held: [],
        },
      ],
    };

    async function mention(preview: EntryPreview): Promise<ComponentFixture<RichTextView>> {
      TestBed.configureTestingModule({
        providers: [provideRichTextTesting(), provideEntryPreviews({ preview: (): EntryPreview => preview })],
      });
      const fixture = TestBed.createComponent(RichTextView);
      fixture.componentRef.setInput('text', MENTION);
      fixture.detectChanges();
      tabStop(fixture)?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await vi.waitFor(() => {
        fixture.detectChanges();
        expect(card()?.textContent).toContain('A flat check.');
      });
      return fixture;
    }

    it('works the DC out at the value the mention names', async () => {
      await mention(NOT_HELD);

      expect(card()?.textContent).toContain('DC 12');
    });

    it("keeps the character's own value when the reader holds the condition", async () => {
      await mention({ ...NOT_HELD, value: ConditionValue.parse(3) });

      expect(card()?.textContent).toContain('DC 10');
    });
  });
});
