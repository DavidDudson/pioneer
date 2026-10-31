import type { ContentId, FundamentalRune } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

export const RuneBadgeKind = { Fundamental: 'fundamental', Property: 'property', Hole: 'hole' } as const;
export type RuneBadgeKind = ValueOf<typeof RuneBadgeKind>;

/** Why a property rune does nothing on the item: the engine does not apply it yet, or the potency rune is too low. */
export const RuneNote = { NotApplied: 'not-applied', NoEffect: 'no-effect' } as const;
export type RuneNote = ValueOf<typeof RuneNote>;

/** One badge under an item's name: a fundamental rune at its grade, a property rune, or a slot with no rune. */
export type RuneBadgeData =
  | { readonly kind: typeof RuneBadgeKind.Fundamental; readonly rune: FundamentalRune; readonly grade: number }
  | {
      readonly kind: typeof RuneBadgeKind.Property;
      readonly id: ContentId;
      readonly name: string;
      readonly note?: RuneNote | undefined;
    }
  | { readonly kind: typeof RuneBadgeKind.Hole };
