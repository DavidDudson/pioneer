import type { ActionLine } from './action-line';

export type { UsePayment } from './action-line';

/** What using something needs to know of it: what it is, its cost and how much of it the turn can pay. */
export type UsableLine = Pick<ActionLine, 'id' | 'name' | 'cost' | 'upTo' | 'affordable' | 'affordableUpTo'> &
  Partial<Pick<ActionLine, 'status' | 'payment'>> & {
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
