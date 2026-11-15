/** A content entry's JSON as a pack file holds it, before the schema has read it. */
export interface EntryJson {
  readonly id: string;
  readonly pack: string;
  readonly slug: string;
  readonly name: string;
  readonly kind?: string;
  readonly level?: number;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly sources: readonly object[];
  readonly description: readonly object[];
  readonly rules: readonly object[];
  readonly data?: object;
}

/** A JSON value a spec builds before the schema under test reads it. */
export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

/** A JSON object a spec builds: the fields of an entry's `data`, a source or a mapping. */
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}
