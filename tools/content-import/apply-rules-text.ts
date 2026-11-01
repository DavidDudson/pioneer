/**
 * The rules of an `--apply-rules` merge, laid into the committed file's own text so every other byte of it stays as it
 * was (the way `apply-outcomes.ts` lays outcomes). An entry keeps its rules as written; the ones it gains are inserted
 * after its last.
 */
import { isDeepStrictEqual } from 'node:util';

import type { ContentId } from '@pioneer/rules/sdk';

import { withMergedRules } from './apply-rules.ts';
import type { RulesMerge } from './apply-rules.ts';
import { spansOf } from './json-spans.ts';
import type { SpanNode } from './json-spans.ts';

const WHITESPACE = /\s/u;

/** An edit of the committed text: `insert` goes in at `at`, replacing `remove` characters. */
interface Edit {
  readonly at: number;
  readonly remove: number;
  readonly insert: string;
}

function isRecord(node: unknown): node is Readonly<Record<string, unknown>> {
  return typeof node === 'object' && node !== null && !Array.isArray(node);
}

/** The position just after the last non-space character before `end`. */
function beforeSpace(text: string, end: number): number {
  let at = end;
  while (WHITESPACE.test(text.charAt(at - 1))) {
    at -= 1;
  }
  return at;
}

/** The rules an entry holds as parsed, and the ones it gains. */
interface Gain {
  readonly held: unknown;
  readonly gained: readonly unknown[];
}

function listed(rules: readonly unknown[]): string {
  return rules.map((rule) => JSON.stringify(rule)).join(', ');
}

/** The edit that adds `gained` to the entry at `node`: after its last rule, into an empty list, or as a new `rules` key. */
function editFor(text: string, node: SpanNode, { held, gained }: Gain): readonly Edit[] {
  if (node.kind !== 'object' || gained.length === 0) {
    return [];
  }
  const rules = node.members.get('rules');
  if (rules?.kind !== 'array') {
    const at = beforeSpace(text, node.end - 1);
    return [{ at, remove: 0, insert: `, "rules": [${listed(gained)}]` }];
  }
  const last = rules.items.at(-1);
  if (last === undefined || !Array.isArray(held)) {
    return [{ at: rules.start, remove: rules.end - rules.start, insert: `[${listed(gained)}]` }];
  }
  return [{ at: last.end, remove: 0, insert: `, ${listed(gained)}` }];
}

function applied(text: string, edits: readonly Edit[]): string {
  let edited = text;
  for (const { at, remove, insert } of edits.toSorted((left, right) => right.at - left.at)) {
    edited = `${edited.slice(0, at)}${insert}${edited.slice(at + remove)}`;
  }
  return edited;
}

/**
 * The committed file `text` with the rules `merge` gives each entry added in place. Throws if the result does not parse
 * to the entries `withMergedRules` computes.
 */
export function mergeRulesIntoText(text: string, merge: RulesMerge): string {
  const entries: unknown = JSON.parse(text);
  const tree = spansOf(text);
  if (!Array.isArray(entries) || tree.kind !== 'array') {
    return text;
  }
  const edits = entries.flatMap((entry: unknown, index): readonly Edit[] => {
    const node = tree.items[index];
    const merged = isRecord(entry) && typeof entry['id'] === 'string' ? merge.get(entry['id'] as ContentId) : undefined;
    if (node === undefined || merged === undefined || !isRecord(entry)) {
      return [];
    }
    const own: readonly unknown[] = Array.isArray(entry['rules']) ? entry['rules'] : [];
    return editFor(text, node, { held: entry['rules'], gained: merged.slice(own.length) });
  });
  const result = applied(text, edits);
  if (!isDeepStrictEqual(JSON.parse(result), withMergedRules(entries, merge))) {
    throw new Error('Splicing the merged rules into the file text changed more than the rules');
  }
  return result;
}
