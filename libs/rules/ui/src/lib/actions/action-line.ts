import type { ActionOrigin, ActionStatus, StatisticValue } from '@pioneer/rules/engine';
import type { ActionCost, ActionMode, ContentId, RichText } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** What using something pays besides its actions, as keys the page that spends understands. */
export interface UsePayment {
  /** The frequency use it counts under. */
  readonly use?: string | undefined;
  /** The spell slot it expends. */
  readonly slot?: string | undefined;
  /** Whether it takes a Focus Point. */
  readonly focus?: boolean | undefined;
  /** The inventory item whose stack using it takes one from: a consumable. */
  readonly consumable?: string | undefined;
  /** The staff and the spell cast from it, paid with the staff's charges. */
  readonly staff?: { readonly item: string; readonly spell: string } | undefined;
}

/** What an item action spends: a stack, a staff's charges, or the uses of an activation. */
export const ActionResourceKind = { Quantity: 'quantity', Charges: 'charges', Uses: 'uses' } as const;
export type ActionResourceKind = (typeof ActionResourceKind)[keyof typeof ActionResourceKind];

/** The resource an item action spends and what is left of it. */
export interface ActionResource {
  readonly kind: ActionResourceKind;
  readonly current: number;
  /** The most it holds; absent when the page does not know it. */
  readonly max?: number | undefined;
}

/** One action on a character's list as the sheet shows it: what the engine decided, with the names it needs. */
export interface ActionLine {
  readonly id: ContentId;
  readonly name: string;
  /** Its traits by name. */
  readonly traits: readonly string[];
  readonly cost: ActionCost | undefined;
  readonly modes: readonly ActionMode[];
  readonly origin: ActionOrigin;
  /** What gives it, by name, for an action the character was granted. */
  readonly source: string | undefined;
  readonly status: ActionStatus;
  /** Why it is not plainly available. */
  readonly reasons: readonly MessageDescriptor[];
  /** When it can be used (a reaction's trigger), as the content words it; absent when it has none. */
  readonly trigger?: RichText | undefined;
  /** What it needs ("you have a free hand"), as the content words it; absent when it needs nothing. */
  readonly requirements?: RichText | undefined;
  /** What it does, as the elements in play change it; the hover summary trims it. */
  readonly effect?: RichText | undefined;
  /** For an item action, the resource using it spends; absent for any other action. */
  readonly resource?: ActionResource | undefined;
  /** What using it pays besides actions; a line with a payment can be used even when its content gives no cost. */
  readonly payment?: UsePayment | undefined;
  /** The best of its skills to roll with its breakdown; absent for an action that rolls nothing. */
  readonly roll: StatisticValue | undefined;
  /** Its place among the actions the situation calls for, first being the most pressing; absent when it calls for none. */
  readonly priority: number | undefined;
  /** Whether it only makes sense in a situation that does not hold now (Shield Block without a raised shield). */
  readonly dormant: boolean;
  /** The most actions a variable cost runs to; absent for a fixed cost. */
  readonly upTo?: number | undefined;
  /** Whether the turn has what its cost takes; absent when the page tracks no turn, which counts as yes. */
  readonly affordable?: boolean | undefined;
  /** The most actions of a variable cost the turn can pay; absent when the page tracks no turn. */
  readonly affordableUpTo?: number | undefined;
}
