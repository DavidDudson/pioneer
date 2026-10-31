import { RuleElementKey, SPELL_RANK_MAX } from '@pioneer/rules/sdk';

/**
 * A `FlatModifier` on a form's speed that depends on the item's level, such as Dragon Form's +20 fly Speed at rank 8
 * (`match(when(gte(@item.level, 8), 20))`) or Aerial Form's +10 at rank 5 and +15 from rank 6, is a set of brackets of
 * the `BattleForm`s that share its effect: Pioneer's form speeds are absolute, so each bracket sets a form's own speed
 * plus the bonus from that rank.
 */

type Fields = Readonly<Record<string, unknown>>;

const MOVEMENTS: ReadonlySet<string> = new Set(['burrow', 'climb', 'fly', 'land', 'swim']);

const MATCH = /^match\((?<whens>.+)\)$/u;
const WHEN =
  /when\((?:gte\(@item\.level, (?<from>\d+)\)|btwn\(@item\.level, (?<low>\d+), (?<high>\d+)\)), (?<bonus>\d+)\)/gu;

function isFields(value: unknown): value is Fields {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** A bonus for the ranks from `low` to `high`. */
interface Tier {
  readonly low: number;
  readonly high: number;
  readonly bonus: number;
}

/** The tiers of a `match(when(...), ...)` formula over the item's level, or nothing when it is any other formula. */
function tiersOf(value: unknown): readonly Tier[] | undefined {
  const whens = typeof value === 'string' ? MATCH.exec(value)?.groups?.['whens'] : undefined;
  if (whens === undefined) {
    return undefined;
  }
  const tiers = [...whens.matchAll(WHEN)].flatMap(({ groups }): Tier[] => {
    const { from, low, high, bonus } = groups ?? {};
    return bonus === undefined
      ? []
      : [{ low: Number(from ?? low), high: Number(high ?? SPELL_RANK_MAX), bonus: Number(bonus) }];
  });
  const rebuilt = tiers.map(({ low, high, bonus }) =>
    high === SPELL_RANK_MAX
      ? `when(gte(@item.level, ${low}), ${bonus})`
      : `when(btwn(@item.level, ${low}, ${high}), ${bonus})`,
  );
  return rebuilt.join(', ') === whens ? tiers : undefined;
}

/** The speed bonus of each rank at which it changes, from the first tier that holds; ranks below hold none. */
function changes(tiers: readonly Tier[]): ReadonlyMap<number, number> {
  const result = new Map<number, number>();
  let before = 0;
  for (let rank = 1; rank <= SPELL_RANK_MAX; rank += 1) {
    const bonus = tiers.find(({ low, high }) => rank >= low && rank <= high)?.bonus ?? 0;
    if (bonus !== before) {
      result.set(rank, bonus);
    }
    before = bonus;
  }
  return result;
}

interface SpeedBonus {
  readonly movement: string;
  readonly changes: ReadonlyMap<number, number>;
}

/** The speed bonus a `FlatModifier` gives by item level, or nothing when it is any other element. */
function speedBonus(raw: unknown): SpeedBonus | undefined {
  if (!isFields(raw) || raw['key'] !== RuleElementKey.FlatModifier || raw['predicate'] !== undefined) {
    return undefined;
  }
  const { selector, value } = raw;
  const movement = typeof selector === 'string' ? selector.replace(/-speed$/u, '') : '';
  const tiers = tiersOf(value);
  if (!MOVEMENTS.has(movement) || selector !== `${movement}-speed` || tiers === undefined) {
    return undefined;
  }
  return { movement, changes: changes(tiers) };
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

/** `form` with `speeds` in the bracket that starts at `start`, added to the bracket there is or a new one. */
function withBracket(form: Fields, start: number, speeds: Fields): Fields {
  const brackets: readonly unknown[] = Array.isArray(form['brackets']) ? form['brackets'] : [];
  const held = brackets.some((each) => startOf(each) === start);
  const changed = held
    ? brackets.map((each) => (startOf(each) === start ? withSpeeds(each, speeds) : each))
    : [...brackets, withSpeeds({ start }, speeds)].toSorted((left, right) => startOf(left) - startOf(right));
  return { ...form, brackets: changed };
}

/** `form` with a bracket for each rank at which `bonus` changes, its speed the form's own plus the bonus. */
function withBonus(form: Fields, { movement, changes: byRank }: SpeedBonus): Fields | undefined {
  const speed = baseSpeed(form, movement);
  if (speed === undefined) {
    return undefined;
  }
  let result = form;
  for (const [rank, bonus] of byRank) {
    result = withBracket(result, rank, { [movement]: speed + bonus });
  }
  return result;
}

interface Folded {
  readonly raws: readonly unknown[];
  readonly folded: boolean;
}

/** `raws` with `bonus` in each `BattleForm` that has a speed for it, and whether any did. */
function foldInto(raws: readonly unknown[], bonus: SpeedBonus): Folded {
  let folded = false;
  const result = raws.map((raw) => {
    const form = isBattleForm(raw) ? withBonus(raw, bonus) : undefined;
    folded ||= form !== undefined;
    return form ?? raw;
  });
  return { raws: result, folded };
}

/**
 * `raws` with each speed `FlatModifier` by item level folded into the `BattleForm`s among them, and gone. One it cannot
 * fold, as there is no form or no form has a number for that speed, stays.
 */
export function withFormSpeedBrackets(raws: readonly unknown[]): readonly unknown[] {
  let result = raws;
  for (const raw of raws) {
    const bonus = speedBonus(raw);
    const { raws: next, folded } = bonus === undefined ? { raws: result, folded: false } : foldInto(result, bonus);
    result = folded ? next.filter((each) => each !== raw) : result;
  }
  return result;
}
