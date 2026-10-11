import { StatisticKind } from '@pioneer/rules/sdk';

/** PF2e modifiers always show their sign, `+0` included. */
export const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'always' };

/** A check reads as the modifier you roll, so its values always have a sign; a DC or a plain value has none. */
export function numberStyle(kind: StatisticKind): Intl.NumberFormatOptions {
  return kind === StatisticKind.Check ? SIGNED : {};
}
