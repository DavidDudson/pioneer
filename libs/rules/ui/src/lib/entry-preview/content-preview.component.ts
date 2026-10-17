import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HoverCard, HoverCardContent, Link, Skeleton, Stack, Text } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { canPreview, ENTRY_PREVIEWS } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';
import type { EntryPreviewView } from './entry-preview.component';

/** Where a card that has to fetch its entry has got to. */
const FetchState = { Idle: 'idle', Loading: 'loading', Failed: 'failed', Missing: 'missing' } as const;
type FetchState = (typeof FetchState)[keyof typeof FetchState];

/** Placeholder lines while the entry loads. */
const LOADING_LINES = ['name', 'summary'];

/**
 * Opens a preview of an entry beside whatever it wraps (a reference, a row's name, a trait chip) while the pointer
 * rests on it or focus is inside it; on touch the first tap opens it and the second follows the link. The page
 * provides the entries with `provideEntryPreviews`. An entry it holds opens at once; one it can fetch is fetched on
 * first open, with a skeleton meanwhile and a failure shown in the card; one it knows nothing about leaves the
 * content as it is. The card links to the entry in full when the page can open it.
 *
 * The card is loaded on first use: it renders rich text, and rich text renders references that wrap themselves
 * in this component, so a static import would be a cycle.
 *
 * ```html
 * <pio-content-preview [entry]="feat.id"><fr-link [to]="target">Power Attack</fr-link></pio-content-preview>
 * ```
 */
@Component({
  selector: 'pio-content-preview',
  imports: [
    HoverCard,
    HoverCardContent,
    Link,
    NgComponentOutlet,
    NgTemplateOutlet,
    Skeleton,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './content-preview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ContentPreview {
  public readonly entry = input.required<ContentId>();

  readonly #previews = inject(ENTRY_PREVIEWS);
  readonly #card = signal<Type<EntryPreviewView> | undefined>(undefined);
  readonly #fetched = signal<EntryPreview | undefined>(undefined);
  readonly #state = signal<FetchState>(FetchState.Idle);

  protected readonly Message = EntryPreviewMessage;
  protected readonly lines = LOADING_LINES;
  protected readonly card = this.#card.asReadonly();
  protected readonly state = this.#state.asReadonly();
  /** The preview the page holds, or else the one fetched. */
  protected readonly shown = computed(
    (): EntryPreview | undefined => this.#previews.preview(this.entry()) ?? this.#fetched(),
  );
  /** Whether there is a card to open: the page holds the entry or can fetch it. */
  protected readonly previewable = computed((): boolean => canPreview(this.#previews, this.entry()));
  protected readonly target = computed((): LinkTarget | undefined => this.#previews.target?.(this.entry()));
  protected readonly inputs = computed(() => ({ preview: this.shown() }));

  protected async load(): Promise<void> {
    const module = await import('./entry-preview.component');
    this.#card.set(module.EntryPreviewView);
    await this.#fetch();
  }

  async #fetch(): Promise<void> {
    const fetch = this.#previews.load;
    const settled = this.shown() !== undefined || this.#state() === FetchState.Loading;
    if (fetch === undefined || settled) {
      return;
    }
    this.#state.set(FetchState.Loading);
    try {
      const fetched = await fetch(this.entry());
      this.#fetched.set(fetched);
      this.#state.set(fetched === undefined ? FetchState.Missing : FetchState.Idle);
    } catch {
      this.#state.set(FetchState.Failed);
    }
  }
}
