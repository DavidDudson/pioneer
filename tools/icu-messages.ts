/**
 * ICU MessageFormat checks for translated catalogs (ADR-0084): a translation must parse, and it must use the same
 * parameters as the `en` message it translates, or the UI shows a blank where `{count}` was.
 *
 * Plural categories differ per language (`en` has `one`/`other`, French adds `many`), so only parameter names are
 * compared, never the arms.
 */
import { parse } from '@messageformat/parser';
import type { Token } from '@messageformat/parser';

function tokenParameters(tokens: ReadonlyArray<Token>): Array<string> {
  return tokens.flatMap((token): Array<string> => {
    if (token.type === 'argument') {
      return [token.arg];
    }

    if (token.type === 'function') {
      return [token.arg, ...tokenParameters(token.param ?? [])];
    }

    if (token.type === 'plural' || token.type === 'select' || token.type === 'selectordinal') {
      return [token.arg, ...token.cases.flatMap((arm) => tokenParameters(arm.tokens))];
    }

    return [];
  });
}

/** What is wrong with a message's ICU syntax, or `undefined` when it parses. */
export function icuProblem(source: string): string | undefined {
  try {
    parse(source);

    return undefined;
  } catch (error) {
    return error instanceof Error ? (error.message.split('\n')[0] ?? error.message) : String(error);
  }
}

/** The parameter names a message uses, sorted; `#` is the plural count, not a parameter. */
export function messageParameters(source: string): ReadonlyArray<string> {
  return [...new Set(tokenParameters(parse(source)))].toSorted();
}

/** How a translation's parameters differ from its source: the ones it dropped and the ones it invented. */
export interface ParameterMismatch {
  readonly dropped: ReadonlyArray<string>;
  readonly added: ReadonlyArray<string>;
}

/** Compares a translation with its `en` source; `undefined` when they agree. Both must parse. */
export function parameterMismatch(source: string, translation: string): ParameterMismatch | undefined {
  const wanted = new Set(messageParameters(source));
  const found = new Set(messageParameters(translation));
  const dropped = [...wanted].filter((name) => !found.has(name));
  const added = [...found].filter((name) => !wanted.has(name));

  return dropped.length === 0 && added.length === 0 ? undefined : { dropped, added };
}
