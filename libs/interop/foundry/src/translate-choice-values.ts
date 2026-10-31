import { Slug } from '@pioneer/rules/sdk';

import { kebab, slugOf } from './foundry-flags';
import { EXPANDED_KEYS, pickedOneOf, predicateOf } from './translate-choice-objects';
import { isFields } from './translate-choice-reads';
import type { Fields } from './translate-choice-reads';

/**
 * A `ChoiceSet` of plain values (a damage type, a number) that other rules of the item read whole,
 * `{item|flags.system.rulesSelections.<flag>}`. Pioneer's rules name no pick, so the pick sets a roll option of the
 * item (`frozen-fog-clumsy-value:2`) and each rule that reads it is made once for each value the choices have,
 * switched on by that roll option, as an object-valued pick does (`translate-choice-objects.ts`). A pick a rule
 * outside the elements below reads, one whose values are no slugs, and one that sets a roll option already, is as it was.
 */

/** The elements that read the pick as a value of their own, besides those a pick of objects expands. */
const READING_KEYS: ReadonlySet<unknown> = new Set([
  ...EXPANDED_KEYS,
  'AdjustModifier',
  'AdjustStrike',
  'BaseSpeed',
  'CreatureSize',
  'TempHP',
]);

const READ_PREFIXES = ['@item.flags.system.rulesSelections.', '{item|flags.system.rulesSelections.'];
const INJECTION = /\{item\|flags\.system\.rulesSelections\.(?<flag>[\w-]+)\}/gu;

/** The flag a whole-text read of a pick names (`{item|flags.system.rulesSelections.damage}`), if `text` is one. */
function wholeRead(text: string): string | undefined {
  const prefix = READ_PREFIXES.find((each) => text.startsWith(each));
  if (prefix === undefined) {
    return undefined;
  }
  const rest = text.slice(prefix.length);
  const flag = prefix.startsWith('{') ? rest.slice(0, -1) : rest;
  const closed = !prefix.startsWith('{') || rest.endsWith('}');
  return closed && /^[\w-]+$/u.test(flag) ? flag : undefined;
}

/** Whether anything under `node` reads the pick of `flag`, whole or inside a longer text. */
function readsPick(node: unknown, flag: string): boolean {
  if (typeof node === 'string') {
    return wholeRead(node) === flag || [...node.matchAll(INJECTION)].some((found) => found.groups?.['flag'] === flag);
  }
  if (Array.isArray(node)) {
    return node.some((each: unknown) => readsPick(each, flag));
  }
  return isFields(node) && Object.values(node).some((each) => readsPick(each, flag));
}

/** Whether anything under `node` mentions a pick of `flag` in a way other than a whole or embedded read. */
function mentionsPick(node: unknown, flag: string): boolean {
  if (typeof node === 'string') {
    return node.includes(`rulesSelections.${flag}`) && !readsPick(node, flag);
  }
  if (Array.isArray(node)) {
    return node.some((each: unknown) => mentionsPick(each, flag));
  }
  return isFields(node) && Object.values(node).some((each) => mentionsPick(each, flag));
}

/** `node` with each read of the pick of `flag` replaced by the choice's value. */
function substituted(node: unknown, flag: string, value: string | number): unknown {
  if (typeof node === 'string') {
    if (wholeRead(node) === flag) {
      return value;
    }
    return node.replaceAll(INJECTION, (read, found: string) => (found === flag ? String(value) : read));
  }
  if (Array.isArray(node)) {
    return node.map((each: unknown) => substituted(each, flag, value));
  }
  if (isFields(node)) {
    return Object.fromEntries(Object.entries(node).map(([field, each]) => [field, substituted(each, flag, value)]));
  }
  return node;
}

/** A choice's value as a plain value, when the choice has one a roll option can carry. */
function plainValue(choice: unknown): string | number | undefined {
  if (!isFields(choice) || !('value' in choice)) {
    return undefined;
  }
  const { value } = choice;
  const text = typeof value === 'number' ? String(value) : value;
  const isPlain = typeof value === 'string' || typeof value === 'number';
  return isPlain && Slug.safeParse(text).success ? value : undefined;
}

/** The values of a `ChoiceSet` of plain choices, all of them; undefined when any choice is not. */
function plainValues(raw: Fields): readonly (string | number)[] | undefined {
  const { choices } = raw;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }
  const values = choices.map((choice: unknown) => plainValue(choice));
  return values.every((value) => value !== undefined) ? values : undefined;
}

/** A pick being spelled out: its flag, the roll option namespace it sets, and the values of its choices. */
interface Pick {
  readonly flag: string;
  readonly namespace: string;
  readonly values: readonly (string | number)[];
}

/** `raw`, an element that reads the pick, made once for each distinct way the values read it, switched on by the roll option. */
function expanded(raw: Fields, pick: Pick): readonly Fields[] {
  const groups = new Map<string, { element: Fields; slugs: string[] }>();
  for (const value of pick.values) {
    const element = substituted(raw, pick.flag, value);
    if (isFields(element)) {
      const key = JSON.stringify(element);
      const group = groups.get(key) ?? { element, slugs: [] };
      group.slugs.push(String(value));
      groups.set(key, group);
    }
  }
  const made: Fields[] = [];
  for (const { element, slugs } of groups.values()) {
    made.push({ ...element, predicate: [...predicateOf(raw), pickedOneOf(pick.namespace, slugs)] });
  }
  return made;
}

/** The `ChoiceSet`s among `raws` that can be made to set a roll option: their flag and values. */
function plainPicks(raws: readonly unknown[]): ReadonlyMap<string, readonly (string | number)[]> {
  const found = new Map<string, readonly (string | number)[]>();
  for (const raw of raws) {
    const flag = isFields(raw) && raw['key'] === 'ChoiceSet' ? raw['flag'] : undefined;
    const values = isFields(raw) && typeof flag === 'string' && !('rollOption' in raw) ? plainValues(raw) : undefined;
    if (typeof flag === 'string' && values !== undefined) {
      found.set(flag, values);
    }
  }
  return found;
}

/** Whether `raw` is a rule other than a `ChoiceSet` that reads the pick of `flag`. */
function isReader(raw: unknown, flag: string): raw is Fields {
  return isFields(raw) && raw['key'] !== 'ChoiceSet' && readsPick(raw, flag);
}

/** Whether the pick of `flag` has a reader, and every rule that mentions it is one that is made for each value. */
function allReadersExpand(raws: readonly unknown[], flag: string): boolean {
  const readers = raws.filter((raw) => isReader(raw, flag));
  const others = raws.filter((raw) => isFields(raw) && raw['key'] !== 'ChoiceSet' && mentionsPick(raw, flag));
  return (
    readers.length > 0 && others.length === 0 && readers.every((raw) => isFields(raw) && READING_KEYS.has(raw['key']))
  );
}

function withPick(raws: readonly unknown[], pick: Pick): readonly unknown[] {
  return raws.flatMap((raw): readonly unknown[] => {
    if (isFields(raw) && raw['key'] === 'ChoiceSet' && raw['flag'] === pick.flag) {
      return [{ ...raw, rollOption: pick.namespace }];
    }
    return isReader(raw, pick.flag) ? expanded(raw, pick) : [raw];
  });
}

/** The roll option namespace a pick sets: its flag, under the item's slug unless the flag starts with it. */
function namespaceOf(item: string, flag: string): string {
  const owner = slugOf(item);
  const picked = kebab(flag);
  return picked.startsWith(owner) ? picked : `${owner}-${picked}`;
}

/**
 * `raws` with every `ChoiceSet` of plain values that only the rules above read whole made to set a roll option of the
 * item, and each of those rules made for each value. Any other rule, and any other `ChoiceSet`, is as it was.
 */
export function withChoiceValues(raws: readonly unknown[], item: string): readonly unknown[] {
  let current = raws;
  for (const [flag, values] of plainPicks(raws)) {
    if (allReadersExpand(current, flag)) {
      current = withPick(current, { flag, namespace: namespaceOf(item, flag), values });
    }
  }
  return current;
}
