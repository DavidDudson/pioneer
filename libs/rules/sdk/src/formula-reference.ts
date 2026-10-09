import { ReferencePath } from '@pioneer/rules/formula';
import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { AttributeSchema } from './attribute';
import type { Attribute } from './attribute';
import { RulesMessage } from './messages';
import { Selector } from './selector';

/*
 * The formula reference vocabulary (ADR-0016): every `@` path a stored formula may use, what it means, and the
 * Foundry spellings the importer translates to it. `docs/architecture/rules-engine.md` ("Formula references")
 * documents the same list.
 */

/** Whose value a reference reads: the character's, or the item the rule element sits on. */
export const ReferenceScope = { Actor: 'actor', Item: 'item' } as const;
export type ReferenceScope = ValueOf<typeof ReferenceScope>;

export const ReferenceKind = {
  Level: 'level',
  AttributeModifier: 'attribute-modifier',
  CappedDexterity: 'capped-dexterity',
  ProficiencyBonus: 'proficiency-bonus',
  ProficiencyRank: 'proficiency-rank',
  Statistic: 'statistic',
  ItemLevel: 'item-level',
} as const;
export type ReferenceKind = ValueOf<typeof ReferenceKind>;

/** A reference the catalogue knows, with the values its placeholders took. */
export type KnownReference =
  | { readonly kind: typeof ReferenceKind.Level }
  | { readonly kind: typeof ReferenceKind.AttributeModifier; readonly attribute: Attribute }
  | { readonly kind: typeof ReferenceKind.CappedDexterity }
  | { readonly kind: typeof ReferenceKind.ProficiencyBonus; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.ProficiencyRank; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.Statistic; readonly selector: Selector }
  | { readonly kind: typeof ReferenceKind.ItemLevel };

/**
 * A path as the catalogue writes it, without its `@`: dotted segments, placeholders in angle brackets
 * (`attr.<attribute>`). A placeholder takes one segment, except `<selector>`, which takes the rest of the path: a
 * selector with its colons written as dots, since references have no colons (`prof.save.fortitude` for
 * `save:fortitude`).
 */
export const ReferencePattern = z.string().brand<'ReferencePattern'>();
export type ReferencePattern = z.infer<typeof ReferencePattern>;

/** A Foundry pf2e reference path in the same notation (`actor.abilities.<attribute>.mod`). */
export const FoundryReferencePattern = z.string().brand<'FoundryReferencePattern'>();
export type FoundryReferencePattern = z.infer<typeof FoundryReferencePattern>;

/** The message key that describes a reference's value. */
type ReferenceMeaning = ValueOf<typeof RulesMessage>;

export interface ReferenceDefinition {
  readonly pattern: ReferencePattern;
  readonly scope: ReferenceScope;
  readonly meaning: ReferenceMeaning;
}

/** Every reference a stored formula may use, by kind. */
export const REFERENCE_CATALOGUE: Readonly<Record<ReferenceKind, ReferenceDefinition>> = {
  [ReferenceKind.Level]: {
    pattern: ReferencePattern.parse('level'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceLevel,
  },
  [ReferenceKind.AttributeModifier]: {
    pattern: ReferencePattern.parse('attr.<attribute>'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceAttributeModifier,
  },
  [ReferenceKind.CappedDexterity]: {
    pattern: ReferencePattern.parse('attr.dex.capped'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceCappedDexterity,
  },
  [ReferenceKind.ProficiencyBonus]: {
    pattern: ReferencePattern.parse('prof.<selector>'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceProficiencyBonus,
  },
  [ReferenceKind.ProficiencyRank]: {
    pattern: ReferencePattern.parse('rank.<selector>'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceProficiencyRank,
  },
  [ReferenceKind.Statistic]: {
    pattern: ReferencePattern.parse('stat.<selector>'),
    scope: ReferenceScope.Actor,
    meaning: RulesMessage.ReferenceStatistic,
  },
  [ReferenceKind.ItemLevel]: {
    pattern: ReferencePattern.parse('item.level'),
    scope: ReferenceScope.Item,
    meaning: RulesMessage.ReferenceItemLevel,
  },
};

/** One Foundry spelling and the Pioneer path it translates to; placeholders carry across by name. */
export interface FoundryReference {
  readonly foundry: FoundryReferencePattern;
  readonly pioneer: ReferencePattern;
}

/** Foundry spelling, then Pioneer path. */
const FOUNDRY_SPELLINGS = [
  ['actor.level', 'level'],
  ['actor.system.details.level.value', 'level'],
  ['actor.abilities.<attribute>.mod', 'attr.<attribute>'],
  ['actor.system.abilities.<attribute>.mod', 'attr.<attribute>'],
  ['actor.skills.<skill>.rank', 'rank.skill.<skill>'],
  ['actor.system.skills.<skill>.rank', 'rank.skill.<skill>'],
  ['actor.saves.<save>.rank', 'rank.save.<save>'],
  ['actor.system.saves.<save>.rank', 'rank.save.<save>'],
  ['actor.perception.rank', 'rank.perception'],
  ['actor.system.perception.rank', 'rank.perception'],
  ['actor.system.proficiencies.attacks.<category>.rank', 'rank.attack.<category>'],
  ['actor.system.proficiencies.defenses.<category>.rank', 'rank.defense.<category>'],
  ['item.level', 'item.level'],
  ['item.system.level.value', 'item.level'],
] as const;

/**
 * The Foundry paths the importer translates (ADR-0016). Foundry spells most values two ways, through the actor's
 * getters and through its `system` data; the exporter writes the first spelling listed for a path. Any other
 * Foundry path is reported as untranslatable.
 */
export const FOUNDRY_REFERENCES: readonly FoundryReference[] = FOUNDRY_SPELLINGS.map(([foundry, pioneer]) => ({
  foundry: FoundryReferencePattern.parse(foundry),
  pioneer: ReferencePattern.parse(pioneer),
}));

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
function match(pattern: ReferencePattern | FoundryReferencePattern, path: ReferencePath): Captures | undefined {
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
    case ReferenceKind.ItemLevel: {
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
function fill(pattern: ReferencePattern, captures: Captures): ReferencePath {
  const filled = segments(pattern).flatMap((segment) =>
    isPlaceholder(segment) ? captured(captures, segment) : segment,
  );
  return ReferencePath.parse(filled.join(SEPARATOR));
}

/**
 * The Pioneer path a Foundry reference path translates to, or undefined when the table has no translation that
 * lands on a known reference. The importer's translation, and the hint when Foundry's spelling is written by hand.
 */
export function fromFoundryPath(path: ReferencePath): ReferencePath | undefined {
  for (const { foundry, pioneer } of FOUNDRY_REFERENCES) {
    const captures = match(foundry, path);
    const translated = captures === undefined ? undefined : fill(pioneer, captures);
    if (translated !== undefined && knownReference(translated) !== undefined) {
      return translated;
    }
  }
  return undefined;
}
