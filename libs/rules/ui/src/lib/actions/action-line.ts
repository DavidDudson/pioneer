import type { ActionOrigin, ActionStatus, StatisticValue } from '@pioneer/rules/engine';
import type { ActionCost, ActionMode, ContentId, RichText } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

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
