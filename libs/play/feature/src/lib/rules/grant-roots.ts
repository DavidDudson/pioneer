import type { GrantRoot } from '@pioneer/rules/grants';
import { ConditionValue, OriginHopKind, SlotKey, Slug } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { SlugTable } from './grant-choices';

const LINE = /\r?\n/u;
const WORDS = /\s+/u;
/** A root line holds a slug, then a value for a valued condition: `frightened 2`. */
const WORDS_MAX = 2;

/** What root lines are read against: the entries' slugs, and which of them are conditions. */
export interface EntrySlugs {
  readonly table: SlugTable;
  readonly conditions: ReadonlySet<Slug>;
}

export interface RootsParse {
  readonly roots: readonly GrantRoot[];
  /** The 1-based lines that are not slugs, or give a value to anything but a condition. */
  readonly bad: readonly number[];
}

/** A condition on the character, at `value` if one is given; undefined when `value` is not a condition's value. */
function conditionRoot(entry: ContentId, value: string | undefined): GrantRoot | undefined {
  if (value === undefined) {
    return { entry, hop: { kind: OriginHopKind.Condition, condition: entry } };
  }
  const parsed = ConditionValue.safeParse(Number(value));
  return parsed.success
    ? { entry, hop: { kind: OriginHopKind.Condition, condition: entry, value: parsed.data } }
    : undefined;
}

/**
 * One line as a root: a condition (`frightened`, or `frightened 2` with a value), else an entry the player picked,
 * its slot named after its slug. Undefined when the line is not one, or gives a value to anything but a condition.
 */
function rootOf(text: string, { table, conditions }: EntrySlugs): GrantRoot | undefined {
  const words = text.split(WORDS);
  const [first, value] = words;
  const slug = Slug.safeParse(first);
  if (words.length > WORDS_MAX || !slug.success) {
    return undefined;
  }
  const entry = table.idOf(slug.data);
  if (conditions.has(slug.data)) {
    return conditionRoot(entry, value);
  }
  return value === undefined
    ? { entry, hop: { kind: OriginHopKind.Choice, slot: SlotKey.parse(slug.data) } }
    : undefined;
}

/** Each filled line as a root. */
export function parseRoots(text: string, slugs: EntrySlugs): RootsParse {
  const roots: GrantRoot[] = [];
  const bad: number[] = [];
  for (const [index, line] of text.split(LINE).entries()) {
    const trimmed = line.trim();
    const root = trimmed === '' ? undefined : rootOf(trimmed, slugs);
    if (root !== undefined) {
      roots.push(root);
    } else if (trimmed !== '') {
      bad.push(index + 1);
    }
  }
  return { roots, bad };
}
