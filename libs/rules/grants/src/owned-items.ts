import type { ContentKind, ContentText, RollOptionTail, Slug } from '@pioneer/rules/sdk';

/**
 * An item the character owns, as a `ChoiceSet` over owned items reads it (ADR-0075). `slug` is the name its Strike has,
 * unique among the character's items of its kind, and is what a pick stores. `rollOptions` are its own, without the
 * `item:` namespace a filter reads them under: `type:weapon`, `trait:agile`, `equipped`.
 */
export interface OwnedItem {
  readonly slug: Slug;
  readonly name: ContentText;
  readonly kind: ContentKind;
  readonly rollOptions: readonly RollOptionTail[];
}
