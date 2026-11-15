/** The fields that are set: a field whose value is `undefined` is absent, so it can be spread into an object. */
export type Present<TFields extends object> = { [Key in keyof TFields]?: Exclude<TFields[Key], undefined> };

/**
 * `fields` without its `undefined` values, in the same order. Spread it to add optional properties to an object that
 * forbids `undefined` ones (`exactOptionalPropertyTypes`): `{ id, ...present({ page, aon }) }`.
 */
export function present<TFields extends object>(fields: TFields): Present<TFields> {
  const kept: Present<TFields> = {};

  return Object.assign(kept, Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)));
}
