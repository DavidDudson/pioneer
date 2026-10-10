import { ReferencePath } from '@pioneer/rules/formula';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeSchema } from './attribute';
import type { Attribute } from './attribute';
import type { FoundryReferencePattern } from './foundry-reference';
import { RulesMessage } from './messages';
import { Selector } from './selector';

/*
 * The formula reference vocabulary (ADR-0016): every `@` path a stored formula may use, what it means, and the
 * Foundry spellings the importer translates to it. `docs/architecture/rules-engine.md` ("Formula references")
 * documents the same list.
 */

/**
 * Whose value a reference reads: the character's, the item the rule element sits on, or the weapon or spellcasting
 * entry a statistic derived per source is derived for.
 */
export const ReferenceScope = { Actor: 'actor', Item: 'item', Weapon: 'weapon', Spellcasting: 'spellcasting' } as const;
export type ReferenceScope = ValueOf<typeof ReferenceScope>;

export const ReferenceKind = {
  Level: 'level',
  AttributeModifier: 'attribute-modifier',
  CappedDexterity: 'capped-dexterity',
  KeyAttributeModifier: 'key-attribute-modifier',
  AncestryHitPoints: 'ancestry-hit-points',
  AncestrySpeed: 'ancestry-speed',
  ClassHitPoints: 'class-hit-points',
  ProficiencyBonus: 'proficiency-bonus',
  ProficiencyRank: 'proficiency-rank',
  Statistic: 'statistic',
  ItemLevel: 'item-level',
  WeaponAttributeModifier: 'weapon-attribute-modifier',
  WeaponProficiencyBonus: 'weapon-proficiency-bonus',
  WeaponPotency: 'weapon-potency',
  SpellcastingAttributeModifier: 'spellcasting-attribute-modifier',
  SpellcastingProficiencyBonus: 'spellcasting-proficiency-bonus',
} as const;
export type ReferenceKind = ValueOf<typeof ReferenceKind>;

/** A reference the catalogue knows, with the values its placeholders took. */
export type KnownReference =
  | { readonly kind: typeof ReferenceKind.Level }
  | { readonly kind: typeof ReferenceKind.AttributeModifier; readonly attribute: Attribute }
  | { readonly kind: typeof ReferenceKind.CappedDexterity }
  | { readonly kind: typeof ReferenceKind.KeyAttributeModifier }
  | { readonly kind: typeof ReferenceKind.AncestryHitPoints }
  | { readonly kind: typeof ReferenceKind.AncestrySpeed }
  | { readonly kind: typeof ReferenceKind.ClassHitPoints }
  | { readonly kind: typeof ReferenceKind.ProficiencyBonus; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.ProficiencyRank; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.Statistic; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.ItemLevel }
  | SourceReference;

/** The kinds that read a weapon or a spellcasting entry: only a statistic derived per that source has one. */
const SOURCE_KINDS = [
  ReferenceKind.WeaponAttributeModifier,
  ReferenceKind.WeaponProficiencyBonus,
  ReferenceKind.WeaponPotency,
  ReferenceKind.SpellcastingAttributeModifier,
  ReferenceKind.SpellcastingProficiencyBonus,
] as const;
type SourceReferenceKind = (typeof SOURCE_KINDS)[number];

/** A reference to the weapon or spellcasting entry a statistic derived per source is derived for. */
export interface SourceReference {
  readonly kind: SourceReferenceKind;
}

const SOURCE_KIND_SET: ReadonlySet<ReferenceKind> = new Set(SOURCE_KINDS);

export function isSourceReference(known: KnownReference): known is SourceReference {
  return SOURCE_KIND_SET.has(known.kind);
}

/**
 * A path as the catalogue writes it, without its `@`: dotted segments, placeholders in angle brackets
 * (`attr.<attribute>`). A placeholder takes one segment, except `<selector>`, which takes the rest of the path: a
 * selector with its colons written as dots, since references have no colons (`prof.save.fortitude` for
 * `save:fortitude`).
 */
export const ReferencePattern = z.string().brand<'ReferencePattern'>();
export type ReferencePattern = z.infer<typeof ReferencePattern>;

/** The message key that describes a reference's value. */
type ReferenceMeaning = ValueOf<typeof RulesMessage>;

export interface ReferenceDefinition {
  readonly pattern: ReferencePattern;
  readonly scope: ReferenceScope;
  readonly meaning: ReferenceMeaning;
}

function reference(
  pattern: z.input<typeof ReferencePattern>,
  scope: ReferenceScope,
  meaning: ReferenceMeaning,
): ReferenceDefinition {
  return { pattern: ReferencePattern.parse(pattern), scope, meaning };
}

const ACTOR = ReferenceScope.Actor;
const ITEM = ReferenceScope.Item;
const WEAPON = ReferenceScope.Weapon;
const SPELLCASTING = ReferenceScope.Spellcasting;

/** Every reference a stored formula may use, by kind. */
export const REFERENCE_CATALOGUE: Readonly<Record<ReferenceKind, ReferenceDefinition>> = {
  [ReferenceKind.Level]: reference('level', ACTOR, RulesMessage.ReferenceLevel),
  [ReferenceKind.AttributeModifier]: reference('attr.<attribute>', ACTOR, RulesMessage.ReferenceAttributeModifier),
  [ReferenceKind.CappedDexterity]: reference('attr.dex.capped', ACTOR, RulesMessage.ReferenceCappedDexterity),
  [ReferenceKind.KeyAttributeModifier]: reference('attr.key', ACTOR, RulesMessage.ReferenceKeyAttributeModifier),
  [ReferenceKind.AncestryHitPoints]: reference('ancestry.hp', ACTOR, RulesMessage.ReferenceAncestryHitPoints),
  [ReferenceKind.AncestrySpeed]: reference('ancestry.speed', ACTOR, RulesMessage.ReferenceAncestrySpeed),
  [ReferenceKind.ClassHitPoints]: reference('class.hp', ACTOR, RulesMessage.ReferenceClassHitPoints),
  [ReferenceKind.ProficiencyBonus]: reference('prof.<selector>', ACTOR, RulesMessage.ReferenceProficiencyBonus),
  [ReferenceKind.ProficiencyRank]: reference('rank.<selector>', ACTOR, RulesMessage.ReferenceProficiencyRank),
  [ReferenceKind.Statistic]: reference('stat.<selector>', ACTOR, RulesMessage.ReferenceStatistic),
  [ReferenceKind.ItemLevel]: reference('item.level', ITEM, RulesMessage.ReferenceItemLevel),
  [ReferenceKind.WeaponAttributeModifier]: reference(
    'weapon.attr',
    WEAPON,
    RulesMessage.ReferenceWeaponAttributeModifier,
  ),
  [ReferenceKind.WeaponProficiencyBonus]: reference(
    'weapon.prof',
    WEAPON,
    RulesMessage.ReferenceWeaponProficiencyBonus,
  ),
  [ReferenceKind.WeaponPotency]: reference('weapon.potency', WEAPON, RulesMessage.ReferenceWeaponPotency),
  [ReferenceKind.SpellcastingAttributeModifier]: reference(
    'spellcasting.attr',
    SPELLCASTING,
    RulesMessage.ReferenceSpellcastingAttributeModifier,
  ),
  [ReferenceKind.SpellcastingProficiencyBonus]: reference(
    'spellcasting.prof',
    SPELLCASTING,
    RulesMessage.ReferenceSpellcastingProficiencyBonus,
  ),
};

/** One dotted segment of a path or pattern: `attr`, `dex`, `<attribute>`. */
const PathSegment = z.string().brand<'PathSegment'>();
type PathSegment = z.infer<typeof PathSegment>;

const SEPARATOR = '.';
const SELECTOR_SEPARATOR = ':';
/** The placeholder that takes the rest of the path. */
const REST = PathSegment.parse('<selector>');
const ATTRIBUTE = PathSegment.parse('<attribute>');
const PLACEHOLDER = /^<[a-z]+>$/u;

/** What each placeholder took, by placeholder (`<attribute>`): one segment, or the rest of the path for `<selector>`. */
type Captures = ReadonlyMap<PathSegment, readonly PathSegment[]>;

function segments(path: ReferencePath | ReferencePattern | FoundryReferencePattern): PathSegment[] {
  return path.split(SEPARATOR).map((segment) => PathSegment.parse(segment));
}

function isPlaceholder(segment: PathSegment): boolean {
  return PLACEHOLDER.test(segment);
}

/** Whether one path segment fits one pattern segment, recording what a placeholder took. */
function fits(wanted: PathSegment, taken: PathSegment | undefined, captures: Map<PathSegment, PathSegment[]>): boolean {
  if (taken === undefined) {
    return false;
  }
  if (isPlaceholder(wanted)) {
    captures.set(wanted, [taken]);
    return true;
  }
  return wanted === taken;
}

/** The placeholders' values when `path` fits `pattern`, or undefined. `<selector>` comes last and takes one or more. */
export function match(pattern: ReferencePattern | FoundryReferencePattern, path: ReferencePath): Captures | undefined {
  const wanted = segments(pattern);
  const given = segments(path);
  const restAt = wanted.indexOf(REST);
  const fixed = restAt === -1 ? wanted : wanted.slice(0, restAt);
  const lengthFits = restAt === -1 ? given.length === wanted.length : given.length > restAt;
  const captures = new Map<PathSegment, PathSegment[]>();
  if (restAt !== -1) {
    captures.set(REST, given.slice(restAt));
  }
  return lengthFits && fixed.every((segment, index) => fits(segment, given[index], captures)) ? captures : undefined;
}

function captured(captures: Captures, placeholder: PathSegment): readonly PathSegment[] {
  return captures.get(placeholder) ?? [];
}

function attributeReference(captures: Captures): KnownReference | undefined {
  const attribute = AttributeSchema.safeParse(captured(captures, ATTRIBUTE).join(SEPARATOR));
  return attribute.success ? { kind: ReferenceKind.AttributeModifier, attribute: attribute.data } : undefined;
}

function selectorIn(captures: Captures): Selector | undefined {
  const selector = Selector.safeParse(captured(captures, REST).join(SELECTOR_SEPARATOR));
  return selector.success ? selector.data : undefined;
}

/** The reference a path names once it fits a kind's pattern, or undefined when a placeholder took a bad value. */
function referenceOf(kind: ReferenceKind, captures: Captures): KnownReference | undefined {
  switch (kind) {
    case ReferenceKind.Level:
    case ReferenceKind.CappedDexterity:
    case ReferenceKind.KeyAttributeModifier:
    case ReferenceKind.AncestryHitPoints:
    case ReferenceKind.AncestrySpeed:
    case ReferenceKind.ClassHitPoints:
    case ReferenceKind.ItemLevel:
    case ReferenceKind.WeaponAttributeModifier:
    case ReferenceKind.WeaponProficiencyBonus:
    case ReferenceKind.WeaponPotency:
    case ReferenceKind.SpellcastingAttributeModifier:
    case ReferenceKind.SpellcastingProficiencyBonus: {
      return { kind };
    }
    case ReferenceKind.AttributeModifier: {
      return attributeReference(captures);
    }
    case ReferenceKind.ProficiencyBonus:
    case ReferenceKind.ProficiencyRank:
    case ReferenceKind.Statistic: {
      const selector = selectorIn(captures);
      return selector === undefined ? undefined : { kind, selector };
    }
    default: {
      return kind satisfies never;
    }
  }
}

const KINDS: readonly ReferenceKind[] = Object.values(ReferenceKind);

/** What a reference path means in Pioneer's vocabulary, or undefined when the catalogue has no such path. */
export function knownReference(path: ReferencePath): KnownReference | undefined {
  for (const kind of KINDS) {
    const captures = match(REFERENCE_CATALOGUE[kind].pattern, path);
    const known = captures === undefined ? undefined : referenceOf(kind, captures);
    if (known !== undefined) {
      return known;
    }
  }
  return undefined;
}

/** The pattern with each placeholder replaced by what it took. */
export function fill(pattern: ReferencePattern, captures: Captures): ReferencePath {
  const filled = segments(pattern).flatMap((segment) =>
    isPlaceholder(segment) ? captured(captures, segment) : segment,
  );
  return ReferencePath.parse(filled.join(SEPARATOR));
}
