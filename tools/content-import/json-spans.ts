/**
 * Where each value of a JSON text sits, so an edit can be made in the text itself and leave every other byte as it was.
 * The text must be valid JSON; a parse that fails throws.
 */

/** A value's place in the text: from `start` to `end` (exclusive). */
export interface Span {
  readonly start: number;
  readonly end: number;
}

export type SpanNode =
  | (Span & { readonly kind: 'object'; readonly members: ReadonlyMap<string, SpanNode> })
  | (Span & { readonly kind: 'array'; readonly items: readonly SpanNode[] })
  | (Span & { readonly kind: 'scalar' });

const WHITESPACE = /\s/u;
const SCALAR_END = /[\s,\]}]/u;

class Reader {
  public position = 0;
  readonly #text: string;

  public constructor(text: string) {
    this.#text = text;
  }

  public skipSpace(): void {
    while (this.position < this.#text.length && WHITESPACE.test(this.#text.charAt(this.position))) {
      this.position += 1;
    }
  }

  public peek(): string {
    return this.#text.charAt(this.position);
  }

  public expect(character: string): void {
    this.skipSpace();
    if (this.peek() !== character) {
      throw new Error(`Expected ${character} at ${this.position}`);
    }
    this.position += 1;
  }

  /** The string at the cursor, with its quotes, and its decoded value. */
  public string(): string {
    const start = this.position;
    this.position += 1;
    while (this.peek() !== '"') {
      this.position += this.peek() === '\\' ? 2 : 1;
      if (this.position >= this.#text.length) {
        throw new Error(`Unterminated string at ${start}`);
      }
    }
    this.position += 1;
    return JSON.parse(this.#text.slice(start, this.position)) as string;
  }

  public scalarEnd(): void {
    while (this.position < this.#text.length && !SCALAR_END.test(this.peek())) {
      this.position += 1;
    }
  }
}

function value(reader: Reader): SpanNode {
  reader.skipSpace();
  const start = reader.position;
  const next = reader.peek();
  if (next === '{') {
    return object(reader, start);
  }
  if (next === '[') {
    return array(reader, start);
  }
  if (next === '"') {
    reader.string();
  } else {
    reader.scalarEnd();
  }
  return { kind: 'scalar', start, end: reader.position };
}

/** Steps over the comma that follows a member or item, if there is one. */
function skipComma(reader: Reader): void {
  reader.skipSpace();
  if (reader.peek() === ',') {
    reader.position += 1;
    reader.skipSpace();
  }
}

function member(reader: Reader): readonly [string, SpanNode] {
  reader.skipSpace();
  const key = reader.string();
  reader.expect(':');
  return [key, value(reader)];
}

function object(reader: Reader, start: number): SpanNode {
  const members = new Map<string, SpanNode>();
  reader.position += 1;
  reader.skipSpace();
  while (reader.peek() !== '}') {
    const [key, node] = member(reader);
    members.set(key, node);
    skipComma(reader);
  }
  reader.position += 1;
  return { kind: 'object', start, end: reader.position, members };
}

function array(reader: Reader, start: number): SpanNode {
  const items: SpanNode[] = [];
  reader.position += 1;
  reader.skipSpace();
  while (reader.peek() !== ']') {
    items.push(value(reader));
    skipComma(reader);
  }
  reader.position += 1;
  return { kind: 'array', start, end: reader.position, items };
}

/** The spans of every value in the JSON `text`. */
export function spansOf(text: string): SpanNode {
  return value(new Reader(text));
}
