import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { BadgeTone, Stack, Tag, Text } from '@pioneer/frontier';
import { Rarity } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { ContentPreview } from '../../entry-preview/content-preview.component';
import { canPreview, ENTRY_PREVIEWS } from '../../entry-preview/entry-preview';

/** One chip: a trait or a tradition, its name already translated. */
export interface Chip {
  readonly label: string;
  readonly tone?: BadgeTone;
  /** The entry the chip names (a trait's), previewed on hover and focus when the page can. */
  readonly entry?: ContentId;
}

/** The tone a trait of each rarity wears: common is plain. */
export const RARITY_TONES: Readonly<Record<Rarity, BadgeTone>> = {
  [Rarity.Common]: BadgeTone.Neutral,
  [Rarity.Uncommon]: BadgeTone.Warning,
  [Rarity.Rare]: BadgeTone.Info,
  [Rarity.Unique]: BadgeTone.Accent,
};

/**
 * Chips in a row that wraps: traits (toned by rarity) or traditions. A chip that names its entry opens a preview of
 * it on hover and focus.
 *
 * ```html
 * <pio-chip-list [chips]="traits()" />
 * ```
 */
@Component({
  selector: 'pio-chip-list',
  imports: [ContentPreview, NgTemplateOutlet, Stack, Tag, Text],
  templateUrl: './chip-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipList {
  public readonly chips = input.required<readonly Chip[]>();

  readonly #previews = inject(ENTRY_PREVIEWS);

  /** A chip is not focusable, so one with a preview is made a tab stop. */
  protected previewable(entry: ContentId): boolean {
    return canPreview(this.#previews, entry);
  }
}
