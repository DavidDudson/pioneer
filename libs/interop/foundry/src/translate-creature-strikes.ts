import { BlockKind, DamageTypeSchema, InlineKind, RichTextString, Trait } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { Count, itemSystem, Name, Slug, Slugs, Traits } from './creature-embedded';
import type { Embedded } from './creature-embedded';
import { langLabel } from './foundry-config';
import { slugify } from './foundry-slug';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';

/** A creature's `melee` items as strikes: attack bonus, damage parts, reach or increment, and what a hit adds. */

const DamageRoll = z.looseObject({ damage: Name, damageType: Slug, category: Slug.nullish() });
const FoundryStrike = z.looseObject({
  bonus: Count.default({ value: 0 }),
  damageRolls: z.record(Slug, DamageRoll).default({}),
  traits: Traits.default({ value: [] }),
  weaponType: z.looseObject({ value: Slug }).nullish(),
  attackEffects: z.looseObject({ value: Slugs.default([]) }).default({ value: [] }),
});

const REACH = 'reach-';
const INCREMENT = 'range-increment-';
const RANGED = 'ranged';
const PERSISTENT = 'persistent';

/** Foundry's die sizes, by number of sides. */
const DIE_BY_SIDES: ReadonlyMap<string, string> = new Map([
  ['4', 'd4'],
  ['6', 'd6'],
  ['8', 'd8'],
  ['10', 'd10'],
  ['12', 'd12'],
]);

interface Damage {
  readonly dice: number;
  readonly die?: string;
  readonly bonus?: number;
  readonly damageType: string;
}

/** The feet after a trait prefix (`reach-30`), if the strike has such a trait. */
function feetOf(prefix: string, traits: readonly string[]): number | undefined {
  const trait = traits.find((each) => each.startsWith(prefix));
  const feet = trait === undefined ? Number.NaN : Number(trait.slice(prefix.length));
  return Number.isNaN(feet) ? undefined : feet;
}

/** "4d12+19" as dice, die and a flat bonus; undefined when the formula is anything more. */
function parseDice(formula: string): Pick<Damage, 'dice' | 'die' | 'bonus'> | undefined {
  const [count, rest, ...extra] = formula.replaceAll(' ', '').split('d');
  const [sides, bonus, ...surplus] = (rest ?? '').split('+');
  const die = DIE_BY_SIDES.get(sides ?? '');
  const dice = Number(count);
  const flat = bonus === undefined ? undefined : Number(bonus);
  const shaped = extra.length === 0 && surplus.length === 0 && die !== undefined;
  const numbers = Number.isInteger(dice) && dice > 0 && (flat === undefined || Number.isInteger(flat));
  return shaped && numbers ? { dice, die, ...(flat === undefined ? {} : { bonus: flat }) } : undefined;
}

/** "4d12+19" or "5" as a damage part; a persistent part, an unknown type or a longer formula is reported. */
function damagePart(roll: z.infer<typeof DamageRoll>, field: string, input: KindInput): Damage | undefined {
  const type = DamageTypeSchema.safeParse(roll.damageType);
  const dice = roll.damage.includes('d') ? parseDice(roll.damage) : undefined;
  const flat = /^\d+$/u.test(roll.damage) ? { dice: 0, bonus: Number(roll.damage) } : undefined;
  const parts = dice ?? flat;
  if (!type.success || roll.category === PERSISTENT || parts === undefined) {
    report(input.log, { reason: KindDataGapReason.UnmappedValue, field, raw: roll });
    return undefined;
  }
  return { ...parts, damageType: type.data };
}

function pascal(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

/** What a strike adds to a hit ("Improved Grab"), named from the lang table, an embedded ability, or its slug. */
function effectsOf(slugs: readonly string[], items: readonly Embedded[], input: KindInput): RichText | undefined {
  const names = slugs.map((slug) => {
    const label = input.lang === undefined ? undefined : langLabel(input.lang, `PF2E.AttackEffect${pascal(slug)}`);
    return label ?? items.find((item) => slugify(item.name) === slug)?.name ?? slug;
  });
  const text = RichTextString.safeParse(names.join(', '));
  return text.success
    ? [{ type: BlockKind.Paragraph, content: [{ type: InlineKind.Text, text: text.data }] }]
    : undefined;
}

function strikeOf(item: Embedded, items: readonly Embedded[], input: KindInput): object | undefined {
  const system = itemSystem(FoundryStrike, item, input);
  if (system === undefined) {
    return undefined;
  }
  const traits = system.traits.value;
  const reach = feetOf(REACH, traits);
  const increment = feetOf(INCREMENT, traits);
  const ranged = system.weaponType?.value === RANGED || increment !== undefined;
  const field = `strikes.${item.name}.damage`;
  const damage = Object.values(system.damageRolls).flatMap((roll) => damagePart(roll, field, input) ?? []);
  const effects = effectsOf(system.attackEffects.value, items, input);
  return {
    name: item.name,
    range: ranged ? RANGED : 'melee',
    bonus: system.bonus.value,
    damage,
    traits: traits.filter((trait) => Trait.safeParse(trait).success),
    ...(reach === undefined ? {} : { reach }),
    ...(increment === undefined ? {} : { increment }),
    ...(effects === undefined ? {} : { effects }),
  };
}

/** The creature's strikes, one per `melee` item. */
export function strikesOf(items: readonly Embedded[], input: KindInput): readonly object[] {
  return items.filter((item) => item.type === 'melee').flatMap((item) => strikeOf(item, items, input) ?? []);
}
