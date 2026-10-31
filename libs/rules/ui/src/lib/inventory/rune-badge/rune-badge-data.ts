import type { ContentId, FundamentalRune } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

export const RuneBadgeKind = { Fundamental: 'fundamental', Property: 'property', Hole: 'hole' } as const;
export type RuneBadgeKind = ValueOf<typeof RuneBadgeKind>;

/** One badge under an item's name: a fundamental rune at its grade, a property rune, or a slot with no rune. */
export type RuneBadgeData =
  | { readonly kind: typeof RuneBadgeKind.Fundamental; readonly rune: FundamentalRune; readonly grade: number }
  | { readonly kind: typeof RuneBadgeKind.Property; readonly id: ContentId; readonly name: string }
  | { readonly kind: typeof RuneBadgeKind.Hole };
