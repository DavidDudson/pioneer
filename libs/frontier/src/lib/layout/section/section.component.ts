import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { Signal } from '@angular/core';

import { AsyncData } from '../../async/async-region/async-data.directive';
import { AsyncEmpty } from '../../async/async-region/async-empty.directive';
import { AsyncError } from '../../async/async-region/async-error.directive';
import { AsyncFilteredEmpty } from '../../async/async-region/async-filtered-empty.directive';
import { AsyncPending } from '../../async/async-region/async-pending.directive';
import { AsyncView } from '../../async/async-region/async-view.component';
import { CardContent } from '../card/card-content.component';
import { Card } from '../card/card.component';
import { Stack } from '../stack/stack.component';
import { DEFAULT_SURFACE_PADDING } from '../surface/surface.component';
import { SectionBody } from './section-body.directive';

/**
 * One section of a long page, such as the character sheet: a raised panel that is a `<section>` region landmark,
 * labelled by its level 2 heading, so both the landmark list and the heading list reach it. `anchor` is the heading's
 * id: an `fr-link` with `skipTo` moves focus to it.
 *
 * Put the content in an `<ng-template frSectionBody>` and it is built only once the section is first shown (not
 * `concealed`), then kept. Projected content is always built, even while concealed, so use the template for any set
 * of sections shown one at a time.
 *
 * ```html
 * <fr-section anchor="sheet-identity" [heading]="'character.sheet.identityHeading' | transloco">
 *   <ng-template frSectionBody>
 *     <fr-grid [columns]="3">…</fr-grid>
 *   </ng-template>
 * </fr-section>
 * ```
 *
 * Give it an `<ng-template [frAsyncData]="query">` instead and it loads its own data: skeleton lines (or a
 * `frAsyncPending` template) while pending, the failure inline, and `frAsyncEmpty` or `frAsyncFilteredEmpty` when the
 * data has nothing in it (`filtered` says a filter is active; the default Clear button emits `cleared`).
 *
 * ```html
 * <fr-section anchor="feats" [heading]="'feats.heading' | transloco" [filtered]="search() !== ''" (cleared)="clear()">
 *   <ng-template [frAsyncData]="feats" let-list>…</ng-template>
 * </fr-section>
 * ```
 */
@Component({
  selector: 'fr-section',
  imports: [AsyncView, Card, CardContent, NgTemplateOutlet, Stack],
  templateUrl: './section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.block]': '!concealed()', '[class.hidden]': 'concealed()', '[attr.aria-busy]': 'pending() || null' },
})
export class Section {
  /** The heading's id, unique on the page; the region is labelled by it and skip links target it. */
  public readonly anchor = input.required<string>();
  /** The section's name, already translated. */
  public readonly heading = input.required<string>();
  /** Keeps the section, with its state, out of sight and the accessibility tree; for the closed ones of a set shown one at a time. */
  public readonly concealed = input(false, { transform: booleanAttribute });

  /** The failure message when the query fails; defaults to a generic "Could not load" in the viewer's locale. */
  public readonly errorMessage = input<string | undefined>(undefined);
  /** A filter or search is narrowing the data, so nothing to show is the filtered-empty state. */
  public readonly filtered = input(false, { transform: booleanAttribute });
  /** The filtered-empty state's Clear button was pressed. */
  public readonly cleared = output();

  /** A section pads like a bare `fr-surface`. */
  protected readonly padding = DEFAULT_SURFACE_PADDING;
  protected readonly body = contentChild(SectionBody);
  protected readonly data = contentChild<AsyncData<unknown>>(AsyncData, { descendants: false });
  protected readonly pendingSlot = contentChild(AsyncPending, { descendants: false });
  protected readonly errorSlot = contentChild(AsyncError, { descendants: false });
  protected readonly emptySlot = contentChild(AsyncEmpty, { descendants: false });
  protected readonly filteredEmptySlot = contentChild(AsyncFilteredEmpty, { descendants: false });
  protected readonly pending = computed(() => this.opened() && (this.data()?.query().isPending() ?? false));
  /** Whether the section has been shown: its body is built from then on. */
  protected readonly opened: Signal<boolean> = linkedSignal<boolean, boolean>({
    source: this.concealed,
    computation: (concealed, previous) => previous?.value === true || !concealed,
  });
}
