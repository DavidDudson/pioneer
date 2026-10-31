import { RuleElementKey } from '@pioneer/rules/sdk';

/**
 * A `FlatModifier` on a form's speed that starts at an item level, such as Dragon Form's +20 fly Speed at rank 8
 * (`match(when(gte(@item.level, 8), 20))`), is a bracket of the `BattleForm` that holds it: Pioneer's form speeds are
 * absolute, so the bracket sets the form's own speed plus the bonus.
 */

type Fields = Readonly<Record<string, unknown>>;

const MOVEMENTS: ReadonlySet<string> = new Set(['burrow', 'climb', 'fly', 'land', 'swim']);

const FROM_LEVEL = /^match\(when\(gte\(@item\.level, (?<start>\d+)\), (?<bonus>\d+)\)\)$/u;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

interface SpeedBonus {
  readonly movement: string;
  readonly start: number;
  readonly bonus: number;
}

/** The speed bonus a `FlatModifier` gives from an item level, or nothing when it is any other element. */
function speedBonus(raw: unknown): SpeedBonus | undefined {
  if (!isFields(raw) || raw['key'] !== RuleElementKey.FlatModifier || raw['predicate'] !== undefined) {
    return undefined;
  }
  const { selector, value } = raw;
  const movement = typeof selector === 'string' ? selector.replace(/-speed$/u, '') : '';
  const groups = typeof value === 'string' ? FROM_LEVEL.exec(value)?.groups : undefined;
  if (!MOVEMENTS.has(movement) || selector !== `${movement}-speed` || groups === undefined) {
    return undefined;
  }
  return { movement, start: Number(groups['start']), bonus: Number(groups['bonus']) };
}

function isBattleForm(raw: unknown): raw is Fields {
  return isFields(raw) && raw['key'] === RuleElementKey.BattleForm && isFields(raw['overrides']);
}

/** The form's own speed in `movement`, when it is a number. */
function baseSpeed(form: Fields, movement: string): number | undefined {
  const { overrides } = form;
  const speeds = isFields(overrides) ? overrides['speeds'] : undefined;
  const speed = isFields(speeds) ? speeds[movement] : undefined;
  return typeof speed === 'number' ? speed : undefined;
}

function startOf(bracket: unknown): number {
  return isFields(bracket) && typeof bracket['start'] === 'number' ? bracket['start'] : 0;
}

/** `bracket` with `speeds` set in its `value`. */
function withSpeeds(bracket: unknown, speeds: Fields): unknown {
  const value = isFields(bracket) && isFields(bracket['value']) ? bracket['value'] : {};
  const held = isFields(value['speeds']) ? value['speeds'] : {};
  return { ...(isFields(bracket) ? bracket : {}), value: { ...value, speeds: { ...held, ...speeds } } };
}

/** `form` with the speed `bonus` in the bracket that starts at its rank, added to the bracket there is or a new one. */
function withBracket(form: Fields, { movement, start, bonus }: SpeedBonus, speed: number): Fields {
  const brackets: readonly unknown[] = Array.isArray(form['brackets']) ? form['brackets'] : [];
  const speeds = { [movement]: speed + bonus };
  const held = brackets.some((each) => startOf(each) === start);
  const changed = held
    ? brackets.map((each) => (startOf(each) === start ? withSpeeds(each, speeds) : each))
    : [...brackets, withSpeeds({ start }, speeds)].toSorted((left, right) => startOf(left) - startOf(right));
  return { ...form, brackets: changed };
}

interface Folded {
  readonly form: Fields;
  readonly folded: ReadonlySet<number>;
}

/** `form` with each speed bonus among `raws` that it has a number for, and the positions of the ones that folded. */
function fold(form: Fields, raws: readonly unknown[]): Folded {
  let folded: Fields = form;
  const gone = new Set<number>();
  for (const [at, raw] of raws.entries()) {
    const bonus = speedBonus(raw);
    const speed = bonus === undefined ? undefined : baseSpeed(folded, bonus.movement);
    if (bonus !== undefined && speed !== undefined) {
      folded = withBracket(folded, bonus, speed);
      gone.add(at);
    }
  }
  return { form: folded, folded: gone };
}

/**
 * `raws` with each speed `FlatModifier` from an item level folded into the `BattleForm` among them, and gone. One it
 * cannot fold, as there is no form or the form has no number for that speed, stays.
 */
export function withFormSpeedBrackets(raws: readonly unknown[]): readonly unknown[] {
  const index = raws.findIndex((raw) => isBattleForm(raw));
  const first = raws[index];
  if (!isBattleForm(first)) {
    return raws;
  }
  const { form, folded } = fold(first, raws);
  return raws.flatMap((raw, at) => (folded.has(at) ? [] : [at === index ? form : raw]));
}
