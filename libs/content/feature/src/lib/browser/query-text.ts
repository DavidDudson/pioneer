import type { QueryParams } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** One query param as the router hands it over: the text, or the texts of a param that repeats. */
export type QueryText = string | ReadonlyArray<string> | undefined;

const FirstText = z.union([z.string(), z.array(z.string()).transform(([first]) => first)]);

/** The text a query param holds, the first of a repeated one; undefined when it holds none. */
export function firstQueryText(text: QueryText): string | undefined {
  const first = FirstText.safeParse(text);

  return first.success ? first.data : undefined;
}

const ParamText = z.union([z.string(), z.array(z.string())]);

/** The text the param `name` holds, once or repeated; undefined when it is absent or holds anything else. */
export function queryTextOf(params: QueryParams, name: string): QueryText {
  const text = ParamText.safeParse(params[name]);

  return text.success ? text.data : undefined;
}
