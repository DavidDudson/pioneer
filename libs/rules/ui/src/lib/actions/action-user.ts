import type { ActionLine } from './action-line';

/** Using an action: the line, and for a variable cost how many actions it is used for. */
export interface ActionUse {
  readonly line: ActionLine;
  readonly actions: number | undefined;
}

/**
 * What using an action does, which the page that lists the actions provides (`pio-actions` knows no turn). Without
 * one the rows show no Use button.
 */
export abstract class ActionUser {
  public abstract use(request: ActionUse): Promise<void>;
}
