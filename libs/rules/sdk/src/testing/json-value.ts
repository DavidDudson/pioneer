import type { RichText } from '../rich-text';

/** A JSON value a fixture builds, before the schema under test parses it; rich text is JSON by design. */
export type JsonValue = string | number | boolean | null | undefined | JsonObject | ReadonlyArray<JsonValue> | RichText;

/** A JSON object a fixture builds: an entry's `data`, a rule element, a file's fields. */
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}
