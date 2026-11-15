/** A JSON value a spec or fixture builds: what a request or a reply carries. */
export type JsonValue = string | number | boolean | null | JsonObject | readonly JsonValue[];

/** A JSON object a spec or fixture builds, such as a reply body the server would send. */
export interface JsonObject {
  readonly [key: string]: JsonValue | undefined;
}

/** A rich-text paragraph holding `text`. */
export const paragraph = (text: string): JsonObject => ({
  type: 'paragraph',
  content: [{ type: 'text', text }],
});
