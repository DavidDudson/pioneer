import { FormulaValue } from '@pioneer/rules/formula';
import {
  Attribute,
  AttributeSchema,
  ContentText,
  DamageAmount,
  FAVORED_WEAPON,
  Feet,
  ItemCount,
  MagicTraditionSchema,
  Origin,
  ReferenceKind,
  RollOptionTail,
  RuleSlug,
  RuneGrade,
  Selector,
  Slug,
  SOURCE_SLUG_MAX,
  StatisticPer,
  Trait,
  WeaponCategory,
  WeaponDamage,
  WeaponGroup,
} from '@pioneer/rules/sdk';
import type { AttributeModifiers, MagicTradition, SourceReference } from '@pioneer/rules/sdk';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EngineMessage } from './messages';
import { SPELLCASTING } from './ranks-in-play';

/** An equipped weapon, as a Strike reads it. */
export interface WeaponInputs {
  /** Unique among the character's weapons; its Strike is `strike:<slug>`. */
  readonly slug: Slug;
  readonly category: WeaponCategory;
  /** Its weapon group, whose critical specialization effect a `CriticalSpecialization` element gives its Strike. */
  readonly group?: WeaponGroup | undefined;
  /** Its own roll options without their namespace (`group:sword`, `picked:f`), which a `CriticalSpecialization` predicate reads as `item:`. */
  readonly rollOptions?: readonly RollOptionTail[] | undefined;
  /** Its traits; `finesse` lets it attack with Dexterity. */
  readonly traits: readonly Trait[];
  /** The precious materials it is made of, as its content names them and `ItemAlteration` elements add them. */
  readonly materials?: readonly Slug[] | undefined;
  /**
   * The flags of the `ChoiceSet`s over owned items that picked it: its rolls also answer to `picked:<flag>-attack` and
   * `picked:<flag>-damage` (ADR-0075).
   */
  readonly picked?: readonly RuleSlug[] | undefined;
  /** The property runes (`flaming`) that `ItemAlteration` elements add to it; those etched on it work through its rules. */
  readonly propertyRunes?: readonly Slug[] | undefined;
  /** The range increment of a ranged weapon, which attacks with Dexterity. A melee weapon, thrown ones included, has none. */
  readonly range?: Feet | undefined;
  /**
   * Its item bonus to attack rolls: the potency rune's grade, or the bonus it has without runes (a bomb's). It reaches
   * its Strike as an `item` modifier, so it competes with other item bonuses (`weaponPotencies`).
   */
  readonly potency?: RuneGrade | undefined;
  /** Its striking rune's grade: the damage dice it adds, which its Strike's damage reads (`strikeDamage`). */
  readonly striking?: RuneGrade | undefined;
  /** What the sheet calls it when no item names it: an attack a feature gives (jaws). A fist is named by a message. */
  readonly label?: ContentText | undefined;
  /** Its damage before runes and modifiers: dice, die and type. A weapon with none has no damage line. */
  readonly damage?: WeaponDamage | undefined;
  /** What a bomb deals to creatures near its target, of its damage's type; undefined for a weapon without splash. */
  readonly splash?: DamageAmount | undefined;
  /** How many of it the stack the character throws from holds; undefined for a weapon that isn't used up. */
  readonly quantity?: ItemCount | undefined;
  /**
   * Whether it is one of the character's deity's favoured weapons: its Strike then reads the better of its category's
   * proficiency and `attack:favored-weapon` (ADR-0048).
   */
  readonly favored?: boolean | undefined;
  /** Why the character has it: its entry and how it got there (an inventory hop). Its potency line's origin. */
  readonly origin: Origin;
}

/** A spellcasting entry, as its spell attack and DC read it. */
export interface SpellcastingInputs {
  /** Unique among the character's entries; its spell attack is `spell-attack:<slug>`. */
  readonly slug: Slug;
  readonly tradition: MagicTradition;
  readonly attribute: Attribute;
}

/** The weapon or spellcasting entry a statistic derived per source is derived for. */
export type SourceInputs =
  | { readonly per: typeof StatisticPer.Weapon; readonly weapon: WeaponInputs }
  | { readonly per: typeof StatisticPer.Spellcasting; readonly entry: SpellcastingInputs };

interface Sourced {
  readonly slug: Slug;
}

/** A list of sources whose slugs are unique, since each names its statistics; a repeat is an issue at its slug. */
function uniqueSlugs<Source extends Sourced>(source: z.ZodType<Source>): z.ZodType<readonly Source[]> {
  return z
    .array(source)
    .readonly()
    .check((context) => {
      const seen = new Set<Slug>();
      for (const [index, { slug }] of context.value.entries()) {
        if (seen.has(slug)) {
          const params = { message: message(EngineMessage.DuplicateSource, { slug }) };
          context.issues.push({ code: 'custom', input: slug, path: [index, 'slug'], params });
        }
        seen.add(slug);
      }
    });
}

/** A source's slug, short enough that every family's `<selector>:<slug>` is a selector. */
const SourceSlug = Slug.refine(
  (slug) => slug.length <= SOURCE_SLUG_MAX,
  issueParams(message(EngineMessage.SourceSlugLength, { maximum: SOURCE_SLUG_MAX })),
);

const WeaponInputsJson = z.strictObject({
  slug: SourceSlug,
  category: z.enum(WeaponCategory),
  traits: z.array(Trait).readonly(),
  group: z.enum(WeaponGroup).optional(),
  rollOptions: z.array(RollOptionTail).readonly().optional(),
  range: Feet.optional(),
  potency: RuneGrade.optional(),
  striking: RuneGrade.optional(),
  label: ContentText.optional(),
  damage: WeaponDamage.optional(),
  splash: DamageAmount.optional(),
  quantity: ItemCount.optional(),
  favored: z.boolean().optional(),
  picked: z.array(RuleSlug).readonly().optional(),
  origin: Origin,
});

const SpellcastingInputsJson = z.strictObject({
  slug: SourceSlug,
  tradition: MagicTraditionSchema,
  attribute: AttributeSchema,
});

export const WeaponsJson = uniqueSlugs<WeaponInputs>(WeaponInputsJson);
export const SpellcastingJson = uniqueSlugs<SpellcastingInputs>(SpellcastingInputsJson);

const FINESSE = Trait.parse('finesse');

/**
 * The attribute a weapon attacks with (Player Core, "Attack Rolls"): Dexterity for a ranged weapon, the higher of
 * Strength and Dexterity for a finesse one (Strength on a tie), else Strength.
 */
function weaponAttribute(weapon: WeaponInputs, attributes: AttributeModifiers): Attribute {
  if (weapon.range !== undefined) {
    return Attribute.Dexterity;
  }
  const dexterityHigher = attributes.get(Attribute.Dexterity) > attributes.get(Attribute.Strength);
  return weapon.traits.includes(FINESSE) && dexterityHigher ? Attribute.Dexterity : Attribute.Strength;
}

const HALF = 2;
const THROWN_PREFIX = 'thrown';
const PROPULSIVE = Trait.parse('propulsive');

/** Whether a weapon is thrown: it has a `thrown` or `thrown-<range>` trait. */
function isThrown(weapon: WeaponInputs): boolean {
  return weapon.traits.some((trait) => trait === THROWN_PREFIX || trait.startsWith(`${THROWN_PREFIX}-`));
}

/**
 * The modifier a Strike adds to damage (Player Core, "Damage Rolls"): Strength for a melee or thrown weapon, half of a
 * positive Strength (rounded down) for a propulsive one, or all of a negative one, nothing for any other ranged weapon.
 */
function weaponDamageModifier(weapon: WeaponInputs, attributes: AttributeModifiers): FormulaValue {
  const strength = attributes.get(Attribute.Strength);
  if (weapon.traits.includes(PROPULSIVE) && weapon.range !== undefined) {
    return FormulaValue.parse(strength > 0 ? Math.floor(strength / HALF) : strength);
  }
  return FormulaValue.parse(weapon.range === undefined || isThrown(weapon) ? strength : 0);
}

/** The attribute a source keys its statistics to: the weapon's attack attribute, or the entry's attribute. */
export function sourceAttribute(source: SourceInputs, attributes: AttributeModifiers): Attribute {
  return source.per === StatisticPer.Weapon ? weaponAttribute(source.weapon, attributes) : source.entry.attribute;
}

/** The proficiency bonus a selector's rank gives; undefined when there is none to read. */
type BonusOf = (selector: Selector) => FormulaValue | undefined;

/** What reading a source reference needs besides the source: the attribute modifiers and a proficiency bonus. */
export interface SourceReading {
  readonly attributes: AttributeModifiers;
  readonly bonus: BonusOf;
}

/** The higher of two bonuses; either alone when the other is undefined. */
function better(left: FormulaValue | undefined, right: FormulaValue | undefined): FormulaValue | undefined {
  if (left === undefined || right === undefined) {
    return left ?? right;
  }
  return right > left ? right : left;
}

/**
 * A weapon's proficiency bonus: its category's (`attack:martial`), or for a favoured weapon the better of that and
 * `attack:favored-weapon`, as Foundry raises a favoured weapon's own proficiency to the favoured weapon rank.
 */
function weaponProficiencyBonus(weapon: WeaponInputs, bonus: BonusOf): FormulaValue | undefined {
  const category = bonus(Selector.parse(`attack:${weapon.category}`));
  return weapon.favored === true ? better(category, bonus(FAVORED_WEAPON)) : category;
}

function weaponValue(
  kind: ReferenceKind,
  weapon: WeaponInputs,
  { attributes, bonus }: SourceReading,
): FormulaValue | undefined {
  if (kind === ReferenceKind.WeaponAttributeModifier) {
    return FormulaValue.parse(attributes.get(weaponAttribute(weapon, attributes)));
  }
  if (kind === ReferenceKind.WeaponDamageModifier) {
    return weaponDamageModifier(weapon, attributes);
  }
  return kind === ReferenceKind.WeaponProficiencyBonus ? weaponProficiencyBonus(weapon, bonus) : undefined;
}

function entryValue(
  kind: ReferenceKind,
  entry: SpellcastingInputs,
  { attributes, bonus }: SourceReading,
): FormulaValue | undefined {
  if (kind === ReferenceKind.SpellcastingAttributeModifier) {
    return FormulaValue.parse(attributes.get(entry.attribute));
  }
  return kind === ReferenceKind.SpellcastingProficiencyBonus ? bonus(SPELLCASTING) : undefined;
}

/**
 * The value a weapon or spellcasting reference reads from `source`; undefined without a source, and for a weapon
 * reference on a spellcasting entry or the reverse, which a statistic's schema already rules out.
 */
export function sourceValue(
  { kind }: SourceReference,
  source: SourceInputs | undefined,
  reading: SourceReading,
): FormulaValue | undefined {
  if (source === undefined) {
    return undefined;
  }
  return source.per === StatisticPer.Weapon
    ? weaponValue(kind, source.weapon, reading)
    : entryValue(kind, source.entry, reading);
}
