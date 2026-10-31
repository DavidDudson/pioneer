/**
 * Reading the pick of an object-valued `ChoiceSet`: where a rule reads a field of it
 * (`{item|flags.system.rulesSelections.<flag>.<field>}`), and the rule with those reads replaced by one choice's fields.
 */

export type Fields = Readonly<Record<string, unknown>>;

export function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const READ_PREFIXES = ['@item.flags.system.rulesSelections.', '{item|flags.system.rulesSelections.'];
const INJECTION_END = '}';

/** The path after the flag in a read of the pick (`speeds.burrow`), or undefined when `text` reads no field of it. */
export function readOf(text: string, flag: string): string | undefined {
  const prefix = READ_PREFIXES.find((each) => text.startsWith(each));
  if (prefix === undefined) {
    return undefined;
  }
  const open = prefix.startsWith('{');
  const rest = text.slice(prefix.length);
  const body = open && rest.endsWith(INJECTION_END) ? rest.slice(0, -INJECTION_END.length) : rest;
  return body.startsWith(`${flag}.`) ? body.slice(flag.length + 1) : undefined;
}

/** What a read of the pick (`path`, such as `speeds.burrow`) comes to in one choice's value; undefined when it has none. */
export function picked(value: unknown, path: string): unknown {
  let current = value;
  for (const step of path.split('.')) {
    if (!isFields(current)) {
      return undefined;
    }
    current = current[step];
  }
  return current ?? undefined;
}

/** A read of a pick inside a longer text (`dragon-form-tradition:{item|…flag.tradition}`): its flag and the path after it. */
const EMBEDDED_READ = /\{item\|flags\.system\.rulesSelections\.(?<flag>[\w-]+)\.(?<path>[\w.]+)\}/gu;

/** The paths of the reads of the pick of `flag` inside `text`. */
function embeddedPaths(text: string, flag: string): readonly string[] {
  return [...text.matchAll(EMBEDDED_READ)]
    .filter((found) => found.groups?.['flag'] === flag)
    .map((found) => found.groups?.['path'] ?? '');
}

/** Whether anything under `node` reads the pick of `flag`. */
export function reads(node: unknown, flag: string): boolean {
  if (typeof node === 'string') {
    return readOf(node, flag) !== undefined || embeddedPaths(node, flag).length > 0;
  }
  if (Array.isArray(node)) {
    return node.some((each: unknown) => reads(each, flag));
  }
  return isFields(node) && Object.values(node).some((each) => reads(each, flag));
}

/** Marks a read whose field the choice does not have, so the entry that holds it is left out. */
export const ABSENT = Symbol('absent');

/** `text` with each read of the pick inside it replaced by the choice's field; absent when the choice lacks one. */
function substitutedText(text: string, flag: string, value: unknown): string | typeof ABSENT {
  const fields = embeddedPaths(text, flag).map((read) => picked(value, read));
  if (fields.some((field) => typeof field !== 'string' && typeof field !== 'number')) {
    return ABSENT;
  }
  let replaced = '';
  let from = 0;
  for (const found of text.matchAll(EMBEDDED_READ)) {
    if (found.groups?.['flag'] === flag) {
      replaced += text.slice(from, found.index) + String(picked(value, found.groups['path'] ?? ''));
      from = found.index + found[0].length;
    }
  }
  return replaced + text.slice(from);
}

/** `node` with each read of the pick replaced by the choice's field; a read the choice has no field for is absent. */
export function substituted(node: unknown, flag: string, value: unknown): unknown {
  if (typeof node === 'string') {
    const path = readOf(node, flag);
    return path === undefined ? substitutedText(node, flag, value) : (picked(value, path) ?? ABSENT);
  }
  if (Array.isArray(node)) {
    const items = node.map((each: unknown) => substituted(each, flag, value));
    return items.includes(ABSENT) ? ABSENT : items;
  }
  if (isFields(node)) {
    const entries = Object.entries(node).map(([field, each]) => [field, substituted(each, flag, value)] as const);
    return entries.some(([, each]) => each === ABSENT) ? ABSENT : Object.fromEntries(entries);
  }
  return node;
}
