import { Feet, HeighteningType, SpellDamageFormula } from '@pioneer/rules/sdk';
import type { Heightening, SpellDamage, SpellData, SpellRank, SpellVariant } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** How many whole steps of an interval heightening a rank is above the spell's. */
const HeighteningSteps = Pg.smallint().nonnegative().brand<'HeighteningSteps'>();
type HeighteningSteps = z.infer<typeof HeighteningSteps>;

/** A damage part's roll. */
type Formula = SpellDamage['formula'];

type IntervalHeightening = Extract<Heightening, { readonly type: typeof HeighteningType.Interval }>;
type FixedHeightening = Extract<Heightening, { readonly type: typeof HeighteningType.Fixed }>;

/** What casting a spell takes, reaches and rolls; a spell's own, or a variant's. */
interface CastFields {
  readonly time: SpellData['time'];
  readonly range: SpellData['range'];
  readonly area: SpellData['area'];
  readonly targets: SpellData['targets'];
  readonly duration: SpellData['duration'];
  readonly defense: SpellData['defense'];
  readonly damage: SpellData['damage'];
}

/** A spell, or one of its variants, as it is cast at one rank: heightening applied. */
export interface SpellCast extends CastFields {
  /** The variant's name; undefined for the spell itself. */
  readonly name: SpellVariant['name'];
}

/** A spell cast at one rank: its own fields, and each variant as that variant casts it. */
export interface SpellAtRank extends SpellCast {
  readonly rank: SpellRank;
  /** Whether it counteracts (Dispel Magic). */
  readonly counteraction: boolean;
  readonly variants: readonly SpellCast[];
}

/** Dice: the `2d6` of `2d6+3 + @spellcasting.attr`. */
const DICE = /^(?<count>\d+)d(?<die>\d+)(?<rest>.*)$/u;
/** A flat amount at the start of what follows dice: the `+3` of ` + 3 + @spellcasting.attr`. */
const FLAT = /^ ?\+ ?(?<flat>\d+)(?![\dd@(.])/u;
const SPACES = /\s+/gu;

/** How many dice a term rolls. */
const DiceCount = Pg.smallint().nonnegative().brand<'DiceCount'>();
/** How many faces each die has. */
const DieFaces = Pg.smallint().positive().brand<'DieFaces'>();
/** A flat amount added to a roll. */
const FlatBonus = Pg.smallint().nonnegative().brand<'FlatBonus'>();

/** A step that is dice alone, with a flat amount if it has one: `2d6`, `1d4+1`. */
interface Step {
  readonly count: z.infer<typeof DiceCount>;
  readonly die: z.infer<typeof DieFaces>;
  readonly flat: z.infer<typeof FlatBonus>;
}

function stepOf(formula: Formula): Step | undefined {
  const [dice = '', flat, ...more] = formula.replaceAll(SPACES, '').split('+');
  const parsed = DICE.exec(dice)?.groups;
  const isPure = parsed?.['rest'] === '' && more.length === 0 && (flat === undefined || /^\d+$/u.test(flat));
  if (parsed?.['count'] === undefined || parsed['die'] === undefined || !isPure) {
    return undefined;
  }
  return {
    count: DiceCount.parse(Number(parsed['count'])),
    die: DieFaces.parse(Number(parsed['die'])),
    flat: FlatBonus.parse(Number(flat ?? 0)),
  };
}

/**
 * `base` with `step` added `steps` times: `2d6` and `+2d6` three times is `8d6`, and `1d4+1` and `+1d4+1` once is
 * `2d4+2`. A step that is not dice alone, or a base that does not start with the same die, is added term by term.
 */
function increased(base: Formula, step: Formula, steps: HeighteningSteps): Formula {
  const added = stepOf(step);
  const lead = DICE.exec(base)?.groups;
  if (added !== undefined && lead?.['count'] !== undefined && String(added.die) === lead['die']) {
    const tail = lead['rest'] ?? '';
    const leadFlat = FLAT.exec(tail);
    const rest = leadFlat === null ? tail : tail.slice(leadFlat[0].length);
    const count = Number(lead['count']) + added.count * steps;
    const flat = Number(leadFlat?.groups?.['flat'] ?? 0) + added.flat * steps;
    const bonus = flat === 0 ? '' : `+${flat}`;
    return SpellDamageFormula.parse(`${count}d${added.die}${bonus}${rest}`);
  }
  return SpellDamageFormula.parse([base, ...Array.from({ length: steps }, () => step)].join(' + '));
}

/** The fields a variant or a fixed rank changes; the rest stay as they are. */
interface CastOverlay {
  readonly time?: SpellData['time'] | undefined;
  readonly range?: SpellData['range'] | undefined;
  readonly area?: SpellData['area'] | undefined;
  readonly targets?: SpellData['targets'] | undefined;
  readonly duration?: SpellData['duration'] | undefined;
  readonly defense?: SpellData['defense'] | undefined;
  readonly damage?: SpellData['damage'] | undefined;
}

/** The fields of `data` that casting reads. */
function fieldsOf(data: SpellData): CastFields {
  const { time, range, area, targets, duration, defense, damage } = data;
  return { time, range, area, targets, duration, defense, damage };
}

/** `fields` with each field `over` has in place of its own. */
function laid(fields: CastFields, over: CastOverlay): CastFields {
  return {
    time: over.time ?? fields.time,
    range: over.range ?? fields.range,
    area: over.area ?? fields.area,
    targets: over.targets ?? fields.targets,
    duration: over.duration ?? fields.duration,
    defense: over.defense ?? fields.defense,
    damage: over.damage ?? fields.damage,
  };
}

/** `fields` heightened by `steps` of an interval: its damage parts grown, and its area. */
function withInterval(fields: CastFields, heightening: IntervalHeightening, steps: HeighteningSteps): CastFields {
  const damage = fields.damage.map((part): SpellDamage => {
    const step = heightening.damage.find(({ key }) => key === part.key);
    return step === undefined ? part : { ...part, formula: increased(part.formula, step.formula, steps) };
  });
  const grown = heightening.area;
  const area =
    fields.area === undefined || grown === undefined
      ? fields.area
      : { ...fields.area, size: Feet.parse(fields.area.size + grown * steps) };
  return { ...fields, damage, area };
}

/** `fields` with each fixed rank at or below `rank` laid over it, lowest first. */
function withFixed(fields: CastFields, heightening: FixedHeightening, rank: SpellRank): CastFields {
  let result = fields;
  const reached = heightening.ranks
    .filter((each) => each.rank <= rank)
    .toSorted((left, right) => left.rank - right.rank);
  for (const { rank: _rank, traits: _traits, ...changes } of reached) {
    result = laid(result, changes);
  }
  return result;
}

/** The rank a spell starts at, and the rank it is cast at. */
interface Casting {
  readonly from: SpellRank;
  readonly rank: SpellRank;
}

/** `fields` heightened from the rank `from` it starts at to `rank`. */
function heightened(fields: CastFields, heightening: Heightening | undefined, { from, rank }: Casting): CastFields {
  if (heightening === undefined) {
    return fields;
  }
  if (heightening.type === HeighteningType.Fixed) {
    return withFixed(fields, heightening, rank);
  }
  const steps = HeighteningSteps.parse(Math.max(0, Math.floor((rank - from) / heightening.interval)));
  return withInterval(fields, heightening, steps);
}

/**
 * A spell cast at `rank`, which is its own rank or higher: its heightening applied (`+2d6` per step in an interval, a
 * fixed rank's fields in place of the spell's), and each variant the same way over the spell's fields with its own
 * laid on top. A cantrip casts at the rank half the character's level rounds up to; the caller passes it.
 */
export function spellAtRank(data: SpellData, rank: SpellRank): SpellAtRank {
  const own = fieldsOf(data);
  const casting: Casting = { from: data.rank, rank };
  const variants: SpellCast[] = [];
  for (const { name, heightening, ...changes } of data.variants ?? []) {
    variants.push({ name, ...heightened(laid(own, changes), heightening ?? data.heightening, casting) });
  }
  return {
    name: undefined,
    ...heightened(own, data.heightening, casting),
    rank,
    counteraction: data.counteraction ?? false,
    variants,
  };
}
