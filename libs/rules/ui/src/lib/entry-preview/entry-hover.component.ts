import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import type { Type } from '@angular/core';
import { HoverCard, HoverCardContent } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';

import { ENTRY_PREVIEWS } from './entry-preview';
import type { EntryPreview } from './entry-preview';
import type { EntryPreviewView } from './entry-preview.component';

/**
 * Opens a preview of an entry beside whatever it wraps (a reference, a row's name) while the pointer rests on it
 * or focus is inside it. The page provides the entries with `provideEntryPreviews`; an entry it doesn't know
 * leaves the content as it is.
 *
 * The card is loaded on first use: it renders rich text, and rich text renders references that wrap themselves
 * in this component, so a static import would be a cycle.
 *
 * ```html
 * <pio-entry-hover [entry]="feat.id"><fr-link [to]="target">Power Attack</fr-link></pio-entry-hover>
 * ```
 */
@Component({
  selector: 'pio-entry-hover',
  imports: [HoverCard, HoverCardContent, NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './entry-hover.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class EntryHover {
  public readonly entry = input.required<ContentId>();

  readonly #previews = inject(ENTRY_PREVIEWS);
  readonly #card = signal<Type<EntryPreviewView> | undefined>(undefined);
  protected readonly card = this.#card.asReadonly();
  protected readonly preview = computed((): EntryPreview | undefined => this.#previews.preview(this.entry()));
  protected readonly inputs = computed(() => ({ preview: this.preview() }));

  protected async load(): Promise<void> {
    const module = await import('./entry-preview.component');
    this.#card.set(module.EntryPreviewView);
  }
}
