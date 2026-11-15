import type { JsonValue } from './json-value';

/** A rule element as JSON, before it is parsed: its `key` and whatever fields that key takes. */
export interface RuleJson {
  readonly key: string;
  readonly [field: string]: JsonValue | undefined;
}
