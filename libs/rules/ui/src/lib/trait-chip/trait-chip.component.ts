import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { BadgeTone, Tag, Text } from '@pioneer/frontier';
import { traitId } from '@pioneer/rules/sdk';
import type { ContentId, Trait } from '@pioneer/rules/sdk';

import { ContentPreview } from '../entry-preview/content-preview.component';
import { canPreview, ENTRY_PREVIEWS } from '../entry-preview/entry-preview';
import { humaniseTrait } from './trait-label';

/**
 * A trait as a chip that opens the trait's card on hover and focus (on touch the first tap opens it and the second
 * follows the link). The name is the producer's `label`, else the loaded entry's name, else the slug read as words.
 * A slug the page can't preview stays a plain chip. A value trait (`deadly-d8`) is its own entry, so the lookup is by
 * slug.
 *
 * ```html
 * <pio-trait-chip [trait]="trait" />
 * ```
 */
@Component({
  selector: 'pio-trait-chip',
  imports: [ContentPreview, Tag, Text],
  templateUrl: './trait-chip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraitChip {
  public readonly trait = input.required<Trait>();
  /** The trait's name when the producer has it. */
  public readonly label = input<string | undefined>();
  public readonly tone = input<BadgeTone>(BadgeTone.Neutral);

  readonly #previews = inject(ENTRY_PREVIEWS);

  protected readonly id = computed((): ContentId => traitId(this.trait()));
  /** A chip is not focusable, so one with a card is made a tab stop. */
  protected readonly previewable = computed((): boolean => canPreview(this.#previews, this.id()));
  protected readonly shownLabel = computed(
    (): string => this.label() ?? this.#previews.preview(this.id())?.name ?? humaniseTrait(this.trait()),
  );
}
