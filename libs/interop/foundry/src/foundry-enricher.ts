/**
 * Foundry's inline enrichers, found in description text: `@Name[params]{label}` (`@UUID`, `@Check`, `@Damage`,
 * `@Template`, ...) and inline commands `[[/cmd args]]{label}` (`[[/r 1d4 #rounds]]`, `[[/act trip]]`). Brackets
 * nest (`@Damage[2d6[fire]]`), so each is read to its matching bracket. Anything unterminated stays text.
 */

/** An `@Name[...]` enricher, or an inline `[[/cmd ...]]` command. */
export const EnricherForm = { Named: 'named', Command: 'command' } as const;

export interface NamedEnricher {
  readonly form: typeof EnricherForm.Named;
  /** `UUID`, `Check`, `Damage`, ... as written after the `@`. */
  readonly name: string;
  /** What is between the outer brackets. */
  readonly params: string;
  readonly label?: string | undefined;
}

export interface CommandEnricher {
  readonly form: typeof EnricherForm.Command;
  /** `r`, `gmr`, `act`, ... as written after the `/`. */
  readonly command: string;
  /** What follows the command, trimmed: `1d4 #rounds`, `trip`. */
  readonly args: string;
  readonly label?: string | undefined;
}

export type Enricher = NamedEnricher | CommandEnricher;

/** Text in reading order, with each enricher found in it. */
export type EnricherPart = string | Enricher;

const OPEN_BRACKET = '[';
const CLOSE_BRACKET = ']';
const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const COMMAND_OPEN = '[[/';
/** `@Name[` or `[[/cmd`, where an enricher may start. */
const START = /@(?<name>[A-Z][A-Za-z]*)\[|\[\[\/(?<command>[a-z]+)\b/gu;

/** One past the bracket that closes the one at `open`, or -1 when it never closes. */
function closing(text: string, open: number, [opener, closer]: readonly [string, string]): number {
  let depth = 0;
  for (let index = open; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === opener) {
      depth += 1;
    } else if (char === closer) {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
  }
  return -1;
}

interface Labelled {
  readonly label?: string | undefined;
  readonly end: number;
}

/** A `{label}` right at `at`, and where the enricher then ends. */
export function labelAt(text: string, at: number): Labelled {
  if (text.charAt(at) !== OPEN_BRACE) {
    return { end: at };
  }
  const end = closing(text, at, [OPEN_BRACE, CLOSE_BRACE]);
  return end === -1 ? { end: at } : { label: text.slice(at + 1, end - 1), end };
}

interface Found {
  readonly enricher: Enricher;
  readonly end: number;
}

function namedAt(text: string, start: number, name: string): Found | undefined {
  const open = start + name.length + 1;
  const end = closing(text, open, [OPEN_BRACKET, CLOSE_BRACKET]);
  if (end === -1) {
    return undefined;
  }
  const { label, end: labelEnd } = labelAt(text, end);
  return {
    enricher: {
      form: EnricherForm.Named,
      name,
      params: text.slice(open + 1, end - 1),
      label,
    },
    end: labelEnd,
  };
}

function commandAt(text: string, start: number, command: string): Found | undefined {
  const end = closing(text, start, [OPEN_BRACKET, CLOSE_BRACKET]);
  if (end === -1) {
    return undefined;
  }
  const args = text.slice(start + COMMAND_OPEN.length + command.length, end - CLOSE_BRACKET.length * 2).trim();
  const { label, end: labelEnd } = labelAt(text, end);
  return {
    enricher: { form: EnricherForm.Command, command, args, label },
    end: labelEnd,
  };
}

function foundAt(text: string, match: RegExpExecArray): Found | undefined {
  const { name, command } = match.groups ?? {};
  if (name !== undefined) {
    return namedAt(text, match.index, name);
  }
  return command === undefined ? undefined : commandAt(text, match.index, command);
}

/** `text` split into plain text and the enrichers in it, in order. Empty text between enrichers is left out. */
export function enricherParts(text: string): EnricherPart[] {
  const parts: EnricherPart[] = [];
  let from = 0;
  for (const match of text.matchAll(START)) {
    const found = match.index >= from ? foundAt(text, match) : undefined;
    if (found !== undefined) {
      parts.push(text.slice(from, match.index), found.enricher);
      from = found.end;
    }
  }
  parts.push(text.slice(from));
  return parts.filter((part) => part !== '');
}

/** Foundry's `a|key:value|flag` parameters; a first part with no `:` is stored under `first`. */
export function enricherParams(params: string, first: string): ReadonlyMap<string, string> {
  const parsed = new Map<string, string>();
  for (const [index, part] of params.split('|').entries()) {
    const colon = part.indexOf(':');
    if (index === 0 && colon === -1) {
      parsed.set(first, part.trim());
    } else if (colon === -1) {
      parsed.set(part.trim(), '');
    } else {
      parsed.set(part.slice(0, colon).trim(), part.slice(colon + 1).trim());
    }
  }
  return parsed;
}
