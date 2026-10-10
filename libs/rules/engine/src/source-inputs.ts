import { FormulaValue } from '@pioneer/rules/formula';
import {
  Attribute,
  AttributeSchema,
  Feet,
  MagicTraditionSchema,
  ReferenceKind,
  RuneGrade,
  Selector,
  Slug,
  SOURCE_SLUG_MAX,
  StatisticPer,
  Trait,
  WeaponCategory,
} from '@pioneer/rules/sdk';
import type { AttributeModifiers, MagicTradition, SourceReference } from '@pioneer/rules/sdk';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { EngineMessage } from './messages';

/** An equipped weapon, as a Strike reads it. */
export interface WeaponInputs {
  /** Unique among the character's weapons; its Strike is `strike:<slug>`. */
  readonly slug: Slug;
  readonly category: WeaponCategory;
  /** Its traits; `finesse` lets it attack with Dexterity. */
  readonly traits: readonly Trait[];
  /** The range increment of a ranged weapon, which attacks with Dexterity. A melee weapon, thrown ones included, has none. */
  readonly range?: Feet | undefined;
  /** Its item bonus to attack rolls: the potency rune's grade, or the bonus it has without runes (a bomb's). */
  readonly potency?: RuneGrade | undefined;
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
  range: Feet.optional(),
  potency: RuneGrade.optional(),
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

/** The attribute a source keys its statistics to: the weapon's attack attribute, or the entry's attribute. */
export function sourceAttribute(source: SourceInputs, attributes: AttributeModifiers): Attribute {
  return source.per === StatisticPer.Weapon ? weaponAttribute(source.weapon, attributes) : source.entry.attribute;
}

/** What reading a source reference needs besides the source: the attribute modifiers and a proficiency bonus. */
export interface SourceReading {
  readonly attributes: AttributeModifiers;
  readonly bonus: (selector: Selector) => FormulaValue | undefined;
}

const NO_POTENCY = FormulaValue.parse(0);

function weaponValue(
  kind: ReferenceKind,
  weapon: WeaponInputs,
  { attributes, bonus }: SourceReading,
): FormulaValue | undefined {
  if (kind === ReferenceKind.WeaponAttributeModifier) {
    return FormulaValue.parse(attributes.get(weaponAttribute(weapon, attributes)));
  }
  if (kind === ReferenceKind.WeaponProficiencyBonus) {
    return bonus(Selector.parse(`attack:${weapon.category}`));
  }
  return kind === ReferenceKind.WeaponPotency ? FormulaValue.parse(weapon.potency ?? NO_POTENCY) : undefined;
}

function entryValue(
  kind: ReferenceKind,
  entry: SpellcastingInputs,
  { attributes, bonus }: SourceReading,
): FormulaValue | undefined {
  if (kind === ReferenceKind.SpellcastingAttributeModifier) {
    return FormulaValue.parse(attributes.get(entry.attribute));
  }
  return kind === ReferenceKind.SpellcastingProficiencyBonus
    ? bonus(Selector.parse(`spellcasting:${entry.tradition}`))
    : undefined;
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
