import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeTone, Stack, Tag } from '@pioneer/frontier';
import { Rarity } from '@pioneer/rules/sdk';

/** One chip: a trait or a tradition, its name already translated. */
export interface Chip {
  readonly label: string;
  readonly tone?: BadgeTone;
}

/** The tone a trait of each rarity wears: common is plain. */
export const RARITY_TONES: Readonly<Record<Rarity, BadgeTone>> = {
  [Rarity.Common]: BadgeTone.Neutral,
  [Rarity.Uncommon]: BadgeTone.Warning,
  [Rarity.Rare]: BadgeTone.Info,
  [Rarity.Unique]: BadgeTone.Accent,
};

/**
 * Chips in a row that wraps: traits (toned by rarity) or traditions.
 *
 * ```html
 * <pio-chip-list [chips]="traits()" />
 * ```
 */
@Component({
  selector: 'pio-chip-list',
  imports: [Stack, Tag],
  templateUrl: './chip-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipList {
  public readonly chips = input.required<readonly Chip[]>();
}
