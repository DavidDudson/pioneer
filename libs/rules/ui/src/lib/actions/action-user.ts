import type { ActionLine } from './action-line';

/**
 * What using something pays besides its actions, as keys the page that spends understands: the frequency use it
 * counts under, the spell slot it expends, or a Focus Point.
 */
export interface UsePayment {
  readonly use?: string | undefined;
  readonly slot?: string | undefined;
  readonly focus?: boolean | undefined;
}

/** What using something needs to know of it: what it is, its cost and how much of it the turn can pay. */
export type UsableLine = Pick<ActionLine, 'id' | 'name' | 'cost' | 'upTo' | 'affordable' | 'affordableUpTo'> &
  Partial<Pick<ActionLine, 'status'>> & {
    /** What it pays besides actions; a line with a payment can be used even when its content gives no cost. */
    readonly payment?: UsePayment | undefined;
    /** Whether using it is an attack, which moves the multiple attack penalty on. */
    readonly attack?: true | undefined;
  };

/** Using an action, Strike, spell or item activation: the line, and for a variable cost how many actions it is used for. */
export interface ActionUse {
  readonly line: UsableLine;
  readonly actions: number | undefined;
}

/**
 * What using something does, which the page that lists it provides (`pio-actions` knows no turn). Without one the rows
 * show no Use button.
 */
export abstract class ActionUser {
  public abstract use(request: ActionUse): Promise<void>;
}
