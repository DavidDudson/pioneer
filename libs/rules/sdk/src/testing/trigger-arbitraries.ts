import { constant, constantFrom, oneof, record, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { TriggerEventType } from '../trigger-event';
import { predicateJson } from './arbitraries';
import { withOptional } from './json-arbitraries';

const triggerEvent: Arbitrary<object> = withOptional(
  record({ event: constantFrom(...Object.values(TriggerEventType)) }),
  { predicate: predicateJson },
);

/** An action's or effect's trigger fields: none, or an event with `autoApply: false` maybe beside it. */
const triggerFields: Arbitrary<object> = oneof(
  constant({}),
  withOptional(record({ triggerEvent }), { autoApply: constant(false) }),
);

/** `data` with trigger fields merged in. */
export function withTrigger(data: Arbitrary<object>): Arbitrary<object> {
  return tuple(data, triggerFields).map(([fields, trigger]): object => ({ ...fields, ...trigger }));
}
