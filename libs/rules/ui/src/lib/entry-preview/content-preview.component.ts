import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { HoverCard, HoverCardContent, Link, Skeleton, Stack, Text, Tone } from '@pioneer/frontier';
import type { LinkTarget } from '@pioneer/frontier';
import type { ContentId, ContentText } from '@pioneer/rules/sdk';

import { canPreview, ENTRY_PREVIEWS } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';
import type { EntryPreviewView } from './entry-preview.component';

/** Where a card that has to fetch its entry has got to. */
const FetchState = { Idle: 'idle', Loading: 'loading', Failed: 'failed', Missing: 'missing' } as const;
type FetchState = (typeof FetchState)[keyof typeof FetchState];

/** What the card shows: the entry, a failure, a miss, or a skeleton while the entry or the card loads. */
const Phase = { Ready: 'ready', Failed: 'failed', Missing: 'missing', Loading: 'loading' } as const;
type Phase = (typeof Phase)[keyof typeof Phase];

/** A fetch result or state, tied to the entry it was for so a changed entry never shows another's. */
interface Keyed<Value> {
  readonly id: ContentId;
  readonly value: Value;
}

interface Notice {
  readonly message: typeof EntryPreviewMessage.LoadFailed | typeof EntryPreviewMessage.NotFound;
  readonly tone: Tone;
}

interface CardLink {
  readonly to: LinkTarget;
  readonly name: ContentText;
}

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
  readonly #fetched = signal<Keyed<EntryPreview> | undefined>(undefined);
  readonly #fetchState = signal<Keyed<FetchState> | undefined>(undefined);
  readonly #state = computed((): FetchState => {
    const keyed = this.#fetchState();
    return keyed?.id === this.entry() ? keyed.value : FetchState.Idle;
  });

  protected readonly Message = EntryPreviewMessage;
  protected readonly lines = LOADING_LINES;
  protected readonly Phase = Phase;
  protected readonly card = this.#card.asReadonly();
  /** The preview the page holds, or else the one fetched for this entry. */
  protected readonly shown = computed((): EntryPreview | undefined => {
    const fetched = this.#fetched();
    return this.#previews.preview(this.entry()) ?? (fetched?.id === this.entry() ? fetched.value : undefined);
  });
  /** The words that stand in for the entry when it failed to load or is not there; none while it loads or shows. */
  protected readonly notice = computed((): Notice | undefined => {
    const phase = this.phase();
    if (phase === Phase.Failed) {
      return { message: EntryPreviewMessage.LoadFailed, tone: Tone.Danger };
    }
    return phase === Phase.Missing ? { message: EntryPreviewMessage.NotFound, tone: Tone.Muted } : undefined;
  });
  /** What the card links to: the entry's page and its name for the link's label. */
  protected readonly link = computed((): CardLink | undefined => {
    const to = this.target();
    const shown = this.shown();
    return to === undefined || shown === undefined ? undefined : { to, name: shown.name };
  });
  protected readonly phase = computed((): Phase => {
    const state = this.#state();
    if (this.shown() !== undefined && this.card() !== undefined) {
      return Phase.Ready;
    }
    if (state === FetchState.Failed) {
      return Phase.Failed;
    }
    return state === FetchState.Missing && this.shown() === undefined ? Phase.Missing : Phase.Loading;
  });
  /** Whether there is a card to open: the page holds the entry or can fetch it. */
  protected readonly previewable = computed((): boolean => canPreview(this.#previews, this.entry()));
  protected readonly target = computed((): LinkTarget | undefined => this.#previews.target?.(this.entry()));
  protected readonly inputs = computed(() => ({ preview: this.shown() }));

  protected async load(): Promise<void> {
    const id = this.entry();
    try {
      const module = await import('./entry-preview.component');
      this.#card.set(module.EntryPreviewView);
    } catch {
      this.#settle(id, FetchState.Failed);
      return;
    }
    await this.#fetch();
  }

  /** Records `state` for `id` unless the entry has changed since, so a late result never clobbers the current one. */
  #settle(id: ContentId, state: FetchState): void {
    if (this.entry() === id) {
      this.#fetchState.set({ id, value: state });
    }
  }

  async #fetch(): Promise<void> {
    const fetch = this.#previews.load;
    const settled = this.shown() !== undefined || this.#state() === FetchState.Loading;
    if (fetch === undefined || settled) {
      return;
    }
    const id = this.entry();
    this.#settle(id, FetchState.Loading);
    try {
      const fetched = await fetch(id);
      if (fetched !== undefined) {
        this.#fetched.set({ id, value: fetched });
      }
      this.#settle(id, fetched === undefined ? FetchState.Missing : FetchState.Idle);
    } catch {
      this.#settle(id, FetchState.Failed);
    }
  }
}
