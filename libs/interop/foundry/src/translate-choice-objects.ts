/**
 * A `ChoiceSet` whose choices carry objects (a dragon's breath shape, damage type and speeds), read by the rules of the
 * same item as `{item|flags.system.rulesSelections.<flag>.<field>}` or `@item.flags.system.rulesSelections.<flag>.<field>`.
 * Pioneer's pick is one slug, so the pick keeps the field a `RollOption` of the item turns into a roll option
 * (`dragon-form:{…dragonType}`), which the `ChoiceSet` now sets itself (`rollOption`), and each `BattleForm` that reads
 * the other fields is split: what does not read the pick stays in the form, and what does becomes one variant for each
 * choice, switched on by that roll option. Any other rules are as they were.
 */

type Fields = Readonly<Record<string, unknown>>;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The roll option a `RollOption` makes of one field of the pick: `dragon-form:` and `dragonType`. */
interface RolledField {
  readonly namespace: string;
  readonly field: string;
}

/** The pick being split: its flag, its choices, and the roll option that names each choice. */
interface Pick {
  readonly flag: string;
  readonly choices: readonly Fields[];
  readonly rolled: RolledField;
}

const READ_PREFIXES = ['@item.flags.system.rulesSelections.', '{item|flags.system.rulesSelections.'];
const INJECTION_END = '}';

/** The path after the flag in a read of the pick (`speeds.burrow`), or undefined when `text` reads no field of it. */
function readOf(text: string, flag: string): string | undefined {
  const prefix = READ_PREFIXES.find((each) => text.startsWith(each));
  if (prefix === undefined) {
    return undefined;
  }
  const open = prefix.startsWith('{');
  const rest = text.slice(prefix.length);
  const body = open && rest.endsWith(INJECTION_END) ? rest.slice(0, -INJECTION_END.length) : rest;
  return body.startsWith(`${flag}.`) ? body.slice(flag.length + 1) : undefined;
}

/** The roll option a `RollOption` element makes of a field of the pick of `flag`: `dragon-form:{item|…flag.dragonType}`. */
function rolledField(raw: unknown, flag: string): RolledField | undefined {
  if (!isFields(raw) || raw['key'] !== 'RollOption' || typeof raw['option'] !== 'string') {
    return undefined;
  }
  const { option } = raw;
  const split = option.indexOf(':');
  const field = split === -1 ? undefined : readOf(option.slice(split + 1), flag);
  return split < 1 || field === undefined || field.includes('.')
    ? undefined
    : { namespace: option.slice(0, split), field };
}

/** Whether `raw` is the `RollOption` that makes `rolled` of the pick of `flag`. */
function isRolledBy(raw: unknown, flag: string, rolled: RolledField): boolean {
  const found = rolledField(raw, flag);
  return found?.namespace === rolled.namespace && found.field === rolled.field;
}

/** The `ChoiceSet`s among `raws` whose choices all carry an object value, by flag. */
function objectChoiceSets(raws: readonly unknown[]): ReadonlyMap<string, readonly Fields[]> {
  const found = new Map<string, readonly Fields[]>();
  for (const raw of raws) {
    if (
      isFields(raw) &&
      raw['key'] === 'ChoiceSet' &&
      typeof raw['flag'] === 'string' &&
      Array.isArray(raw['choices'])
    ) {
      const choices: readonly unknown[] = raw['choices'];
      const objects = choices.filter((choice): choice is Fields => isFields(choice) && isFields(choice['value']));
      if (objects.length > 0 && objects.length === choices.length) {
        found.set(raw['flag'], objects);
      }
    }
  }
  return found;
}

/** What a read of the pick (`path`, such as `speeds.burrow`) comes to in one choice's value; undefined when it has none. */
function picked(value: unknown, path: string): unknown {
  let current = value;
  for (const step of path.split('.')) {
    if (!isFields(current)) {
      return undefined;
    }
    current = current[step];
  }
  return current ?? undefined;
}

/** Whether anything under `node` reads the pick of `flag`. */
function reads(node: unknown, flag: string): boolean {
  if (typeof node === 'string') {
    return readOf(node, flag) !== undefined;
  }
  if (Array.isArray(node)) {
    return node.some((each: unknown) => reads(each, flag));
  }
  return isFields(node) && Object.values(node).some((each) => reads(each, flag));
}

/** Marks a read whose field the choice does not have, so the entry that holds it is left out. */
const ABSENT = Symbol('absent');

/** `node` with each read of the pick replaced by the choice's field; a read the choice has no field for is absent. */
function substituted(node: unknown, flag: string, value: unknown): unknown {
  if (typeof node === 'string') {
    const path = readOf(node, flag);
    return path === undefined ? node : (picked(value, path) ?? ABSENT);
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

/** Whether a split-off statistic has no entries left. */
function isEmpty(statistic: unknown): boolean {
  if (Array.isArray(statistic)) {
    return statistic.length === 0;
  }
  return isFields(statistic) && Object.keys(statistic).length === 0;
}

/** A statistic split into the entries that do not read the pick and those that do. */
interface Split {
  readonly kept: unknown;
  readonly dependent: unknown;
}

/** `statistic`, a list or a record, split an entry at a time; undefined when no entry reads the pick. */
function splitStatistic(statistic: unknown, flag: string): Split | undefined {
  if (Array.isArray(statistic)) {
    const items: readonly unknown[] = statistic;
    const dependent = items.filter((item) => reads(item, flag));
    return dependent.length === 0 ? undefined : { kept: items.filter((item) => !reads(item, flag)), dependent };
  }
  if (!isFields(statistic)) {
    return undefined;
  }
  const entries = Object.entries(statistic);
  const dependent = entries.filter(([, each]) => reads(each, flag));
  if (dependent.length === 0) {
    return undefined;
  }
  return {
    kept: Object.fromEntries(entries.filter(([, each]) => !reads(each, flag))),
    dependent: Object.fromEntries(dependent),
  };
}

/** The dependent entries of a statistic for one choice: its fields in, and the entries it has no field for left out. */
function forChoice(dependent: unknown, flag: string, value: unknown): unknown {
  if (Array.isArray(dependent)) {
    return dependent.map((item: unknown) => substituted(item, flag, value)).filter((item) => item !== ABSENT);
  }
  if (!isFields(dependent)) {
    return dependent;
  }
  return Object.fromEntries(
    Object.entries(dependent)
      .map(([field, each]) => [field, substituted(each, flag, value)] as const)
      .filter(([, each]) => each !== ABSENT),
  );
}

/** A choice's value for the field the roll option reads, which is the slug of the pick. */
function slugOfChoice(choice: Fields, field: string): string | undefined {
  const value = picked(choice['value'], field);
  return typeof value === 'string' ? value : undefined;
}

/** A form's overrides split into what stays in the form and what reads the pick. */
interface Divided {
  readonly kept: Record<string, unknown>;
  readonly dependent: Record<string, unknown>;
}

function divided(overrides: Fields, flag: string): Divided {
  const kept: Record<string, unknown> = {};
  const dependent: Record<string, unknown> = {};
  for (const [name, statistic] of Object.entries(overrides)) {
    const split = splitStatistic(statistic, flag);
    if (split === undefined) {
      kept[name] = statistic;
    } else {
      dependent[name] = split.dependent;
      if (!isEmpty(split.kept)) {
        kept[name] = split.kept;
      }
    }
  }
  return { kept, dependent };
}

/** The variant of one choice, switched on by its roll option; undefined for a choice without the field. */
function variantOf(choice: Fields, dependent: Fields, pick: Pick): Fields | undefined {
  const slug = slugOfChoice(choice, pick.rolled.field);
  if (slug === undefined) {
    return undefined;
  }
  const changes = Object.entries(dependent)
    .map(([name, statistic]) => [name, forChoice(statistic, pick.flag, choice['value'])] as const)
    .filter(([, statistic]) => !isEmpty(statistic));
  return { predicate: [`${pick.rolled.namespace}:${slug}`], ...Object.fromEntries(changes) };
}

/** `battleForm` with the statistics that read the pick moved into one variant for each choice. */
function withVariants(battleForm: Fields, pick: Pick): Fields {
  const { overrides } = battleForm;
  if (!isFields(overrides) || !reads(overrides, pick.flag)) {
    return battleForm;
  }
  const { kept, dependent } = divided(overrides, pick.flag);
  const variants = pick.choices
    .map((choice) => variantOf(choice, dependent, pick))
    .filter((each) => each !== undefined);
  return { ...battleForm, overrides: kept, variants };
}

/** A choice with its value the field the roll option reads, so the pick is one slug. */
function plainChoice(choice: Fields, field: string): Fields {
  const slug = slugOfChoice(choice, field);
  return slug === undefined ? choice : { ...choice, value: slug };
}

/** `raw` made to fit the pick: its `ChoiceSet` a plain one that sets the roll option, its `BattleForm` split. */
function fitted(raw: unknown, pick: Pick): unknown {
  if (!isFields(raw)) {
    return raw;
  }
  if (raw['key'] === 'ChoiceSet' && raw['flag'] === pick.flag) {
    const choices = pick.choices.map((choice) => plainChoice(choice, pick.rolled.field));
    return { ...raw, choices, rollOption: pick.rolled.namespace };
  }
  return raw['key'] === 'BattleForm' ? withVariants(raw, pick) : raw;
}

/** `raws` made to fit the pick of `flag` when a `RollOption` of the item reads a field of it; as they were otherwise. */
function withPick(raws: readonly unknown[], flag: string, choices: readonly Fields[]): readonly unknown[] {
  const rolled = raws.map((raw) => rolledField(raw, flag)).find((found) => found !== undefined);
  if (rolled === undefined) {
    return raws;
  }
  const pick: Pick = { flag, choices, rolled };
  return raws.filter((raw) => !isRolledBy(raw, flag, rolled)).map((raw) => fitted(raw, pick));
}

/**
 * `raws` with every object-valued `ChoiceSet` that a `RollOption` of the item reads a field of made a plain pick that
 * sets that roll option itself, the `RollOption` folded into it, and each `BattleForm` reading the pick's other fields
 * split into variants. A `ChoiceSet` no `RollOption` reads a field of, and any other rule, is as it was.
 */
export function withChoiceObjects(raws: readonly unknown[]): readonly unknown[] {
  let current = raws;
  for (const [flag, choices] of objectChoiceSets(raws)) {
    current = withPick(current, flag, choices);
  }
  return current;
}
