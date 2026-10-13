/** Replaces the value at a place a character names a content entry: an id for a reference, or the reverse. */
export type RewriteReference = (value: unknown) => unknown;

export type Fields = Readonly<Record<string, unknown>>;

const REF_NODE = 'ref';
const RICH_TEXT_FIELDS: readonly string[] = ['notes', 'appearance', 'personality'];

export function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `value` with `change` applied to its `key` field; anything that isn't an object holding it is left as it is. */
function changeField(value: unknown, key: string, change: (field: unknown) => unknown): unknown {
  return isFields(value) && key in value ? { ...value, [key]: change(value[key]) } : value;
}

function changeEach(value: unknown, change: (item: unknown) => unknown): unknown {
  return Array.isArray(value) ? value.map((item) => change(item)) : value;
}

function changeValues(value: unknown, change: (item: unknown) => unknown): unknown {
  return isFields(value) ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, change(item)])) : value;
}

/** Rich text nests blocks in blocks, so every `ref` node is found by walking all of it. */
function changeRichText(value: unknown, rewrite: RewriteReference): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => changeRichText(item, rewrite));
  }
  if (!isFields(value)) {
    return value;
  }
  if (value['type'] === REF_NODE) {
    return changeField(value, 'id', rewrite);
  }
  return changeValues(value, (item) => changeRichText(item, rewrite));
}

function changeBuild(build: unknown, rewrite: RewriteReference): unknown {
  return changeField(
    changeField(build, 'choices', (choices) => changeValues(choices, rewrite)),
    'spellAccess',
    (access) => changeEach(access, rewrite),
  );
}

function changeItem(item: unknown, rewrite: RewriteReference): unknown {
  return changeField(changeField(item, 'item', rewrite), 'runes', (runes) =>
    changeField(runes, 'property', (property) => changeEach(property, rewrite)),
  );
}

function changeNotes(document: unknown, rewrite: RewriteReference): unknown {
  let result = document;
  for (const key of RICH_TEXT_FIELDS) {
    result = changeField(result, key, (text) => changeRichText(text, rewrite));
  }
  return result;
}

/**
 * A stored character document with `rewrite` applied at every place it names a content entry: choices, spell access,
 * inventory items and their property runes, conditions, and the entry links inside notes, appearance and
 * personality. The one list of those places, so export and read cannot disagree on it. Anything of another shape is
 * left for the schema to refuse.
 */
export function rewriteReferences(document: Fields, rewrite: RewriteReference): Fields {
  const withBuild = changeField(document, 'build', (build) => changeBuild(build, rewrite));
  const withInventory = changeField(withBuild, 'inventory', (inventory) =>
    changeField(inventory, 'items', (items) => changeEach(items, (item) => changeItem(item, rewrite))),
  );
  const withPlay = changeField(withInventory, 'play', (play) =>
    changeField(play, 'conditions', (conditions) =>
      changeEach(conditions, (condition) => changeField(condition, 'condition', rewrite)),
    ),
  );
  const result = changeNotes(withPlay, rewrite);
  return isFields(result) ? result : document;
}
