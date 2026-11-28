/** A JSON value a spec or fixture builds: what a request or a reply carries. */
export type JsonValue = string | number | boolean | null | JsonObject | ReadonlyArray<JsonValue>;

/** A JSON object a spec or fixture builds, such as a reply body the server would send. */
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}
