import { DamageFormula, Feet, HeighteningType } from '@pioneer/rules/sdk';
import type { Heightening, SpellDamage, SpellData, SpellRank, SpellVariant } from '@pioneer/rules/sdk';
import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** How many whole steps of an interval heightening a rank is above the spell's. */
const HeighteningSteps = Pg.smallint().nonnegative().brand<'HeighteningSteps'>();
type HeighteningSteps = z.infer<typeof HeighteningSteps>;

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

/** A dice term alone: `2d6`. */
const PURE_DICE = /^(?<count>\d+)d(?<die>\d+)$/u;
/** The dice term a formula starts with: the `2d6` of `2d6 + 3`. */
const LEADING_DICE = /^(?<count>\d+)d(?<die>\d+)(?<rest>.*)$/u;

/**
 * `base` with `step` added `steps` times: `2d6` and `+2d6` three times is `8d6`. A step that is not dice alone, or a base
 * that does not start with the same die, is added term by term.
 */
function increased(base: DamageFormula, step: DamageFormula, steps: HeighteningSteps): DamageFormula {
  const added = PURE_DICE.exec(step)?.groups;
  const lead = LEADING_DICE.exec(base)?.groups;
  if (added?.['count'] !== undefined && lead?.['count'] !== undefined && added['die'] === lead['die']) {
    const count = Number(lead['count']) + Number(added['count']) * steps;
    return DamageFormula.parse(`${count}d${lead['die']}${lead['rest'] ?? ''}`);
  }
  return DamageFormula.parse([base, ...Array.from({ length: steps }, () => step)].join(' + '));
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
