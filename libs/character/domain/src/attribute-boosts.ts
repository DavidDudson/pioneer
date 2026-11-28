import { grantLookup } from '@pioneer/rules/grants';
import {
  AncestryId,
  Attribute,
  AttributeModifiers,
  AttributeModifiersWire,
  AttributeSchema,
  ContentId,
  ContentKind,
  Level,
  SlotKey,
} from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentRegistry } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { BoostContentOptions } from './boost-content-options';
import { APEX_LEVEL, BoostKind, inLevelOrder, modifierOf } from './boost-modifier';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  CHARACTER_ROOT_SLOTS,
  CLASS_SLOT,
  hasSecondClass,
  SECOND_CLASS_SLOT,
} from './character-slots';
import { grantedKeyOptions } from './granted-key-options';

/** Where a set of boosts comes from: the character's ancestry, background, class or second class, or its level. */
export const BoostSource = {
  Ancestry: 'ancestry',
  Background: 'background',
  Class: 'class',
  /** The key attribute of a Dual Class character's second class. */
  SecondClass: 'second-class',
  Free: 'free',
  /** The apex attribute increase of Automatic Bonus Progression. */
  Apex: 'apex',
} as const;

export type BoostSource = ValueOf<typeof BoostSource>;

/** One boost, as the attributes it may raise: all six for a free boost, one for a fixed boost. */
export type Boost = ReadonlyArray<Attribute>;

/** An ancestry's boosts, and the attributes it lowers. */
export interface AncestryBoosts {
  readonly boosts: ReadonlyArray<Boost>;
  readonly flaws: ReadonlyArray<Attribute>;
}

/** What boosts are read from: the boosts of each ancestry, background and class, by id. */
export interface BoostContent {
  readonly ancestry: (id: ContentId) => AncestryBoosts | undefined;
  readonly background: (id: ContentId) => ReadonlyArray<Boost> | undefined;
  readonly keyAttribute: (id: ContentId) => Boost | undefined;
  /** Whether the character has a second class slot (Dual Class), so its key attribute is a boost of its own. */
  readonly secondClass: boolean;
  /** Whether the free boosts come one a level over the four levels up to each fifth (Gradual Attribute Boosts). */
  readonly gradual: boolean;
  /** Whether the character has an apex attribute increase at 17th level (Automatic Bonus Progression). */
  readonly apex: boolean;
  /** What the character's 1st-level class features add to its key attribute options: Strength for a ruffian rogue. */
  readonly keyAttributeOptions: (document: CharacterDocument) => ReadonlyArray<Attribute>;
}

/** A boost the player places: one slot, what it may raise, and what it raises. */
export interface BoostSlot {
  readonly key: SlotKey;
  readonly level: Level;
  readonly source: BoostSource;
  /** What the boost allows, less what the fixed boosts of its set already raise. */
  readonly options: ReadonlyArray<Attribute>;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: Attribute | undefined;
}

/**
 * A voluntary ancestry flaw (Player Core): one slot keyed `flaw:1:ancestry:<n>`, the attributes it may lower, and what
 * it lowers. Taking one is optional, so an empty flaw slot is never missing.
 */
export interface FlawSlot {
  readonly key: SlotKey;
  /** Every attribute but those the ancestry flaws already. */
  readonly options: ReadonlyArray<Attribute>;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: Attribute | undefined;
}

/** Boosts given together, which must each raise a different attribute: those with one option, and the slots. */
export interface BoostSet {
  readonly level: Level;
  readonly source: BoostSource;
  readonly fixed: ReadonlyArray<Attribute>;
  readonly slots: ReadonlyArray<BoostSlot>;
}

const ATTRIBUTES: ReadonlyArray<Attribute> = Object.values(Attribute);

/** A free boost may raise any attribute. */
const FREE_BOOST: Boost = ATTRIBUTES;
const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Free boosts come at 1st level and every fifth level after (Player Core), four at a time. */
const FREE_BOOST_INTERVAL = 5;
const FREE_BOOSTS_PER_LEVEL = 4;

const FREE_BOOST_LEVELS: ReadonlyArray<Level> = [
  FIRST_LEVEL,
  ...Array.from({ length: CHARACTER_LEVEL_MAX / FREE_BOOST_INTERVAL }, (_unused, index) =>
    Level.parse((index + 1) * FREE_BOOST_INTERVAL),
  ),
];

const FREE_BOOSTS: ReadonlyArray<Boost> = Array.from({ length: FREE_BOOSTS_PER_LEVEL }, () => FREE_BOOST);

/**
 * Gradual Attribute Boosts (GM Core): the four boosts of each fifth level come one a level over it and the three before.
 * Each group is still one set, so its four boosts raise different attributes.
 */
const GRADUAL_BOOST_PLACES: ReadonlyMap<Level, ReadonlyArray<Level>> = new Map(
  FREE_BOOST_LEVELS.slice(1).map((last) => [
    last,
    Array.from({ length: FREE_BOOSTS_PER_LEVEL }, (_unused, index) =>
      Level.parse(last - FREE_BOOSTS_PER_LEVEL + 1 + index),
    ),
  ]),
);

/**
 * The boosts of the registry's ancestries, and of the backgrounds and classes its packs hold as entries, for a
 * character with `rootSlots`. `lookup` is the grant lookup the key attribute options are read from, which a caller that
 * has one shares, as a registry builds a lookup once per `legacyContent`.
 */
export function boostContent(
  registry: ContentRegistry,
  {
    rootSlots = CHARACTER_ROOT_SLOTS,
    lookup = () => grantLookup(registry),
    gradual = false,
    apex = false,
  }: BoostContentOptions = {},
): BoostContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);

  const backgrounds = new Map(
    entries.flatMap((entry) => (entry.kind === ContentKind.Background ? [[entry.id, entry.data.boosts] as const] : [])),
  );

  const classes = new Map(
    entries.flatMap((entry) =>
      entry.kind === ContentKind.Class ? [[entry.id, entry.data.keyAttribute] as const] : [],
    ),
  );

  return {
    ancestry: (id: ContentId): AncestryBoosts | undefined => {
      const definition = registry.ancestry(AncestryId.parse(id))?.definition;

      return definition === undefined ? undefined : { boosts: definition.boosts, flaws: definition.flaws };
    },
    background: (id: ContentId): ReadonlyArray<Boost> | undefined => backgrounds.get(id),
    keyAttribute: (id: ContentId): Boost | undefined => classes.get(id),
    secondClass: hasSecondClass(rootSlots),
    gradual,
    apex,
    keyAttributeOptions: grantedKeyOptions({ registry, entries, rootSlots, lookup }),
  };
}

/** The entry picked in a root slot, if the pick is an id. */
function pickedId(document: CharacterDocument, slot: SlotKey): ContentId | undefined {
  const picked = ContentId.safeParse(document.build.choices[slot]);

  return picked.success ? picked.data : undefined;
}

/**
 * The attribute `value` names, if the slot offers it. A pick no longer on offer (left from another ancestry, or
 * after an errata) counts for nothing.
 */
function offeredPick(value: ChoiceValue | undefined, options: ReadonlyArray<Attribute>): Attribute | undefined {
  const parsed = AttributeSchema.safeParse(value);

  return parsed.success && options.includes(parsed.data) ? parsed.data : undefined;
}

/** Boosts given together: at what level, from where, and what each may raise. */
interface BoostOrigin {
  readonly level: Level;
  readonly source: BoostSource;
  readonly boosts: ReadonlyArray<Boost>;
  /** The level each boost is taken at, when the set's boosts come over several levels; `level` for each if unset. */
  readonly places?: ReadonlyArray<Level> | undefined;
}

/**
 * One set of boosts: a boost with one option is fixed, every other is a slot keyed `boost:<level>:<source>:<n>`,
 * `n` its place among the set's boosts. A slot offers what its boost allows less the set's fixed attributes.
 */
function boostSet(document: CharacterDocument, { level, source, boosts, places }: BoostOrigin): BoostSet {
  const fixed = boosts.flatMap((boost) => (boost.length === 1 ? boost : []));

  const slots = boosts.flatMap((boost, index): Array<BoostSlot> => {
    if (boost.length === 1) {
      return [];
    }

    const place = places?.[index];
    const slotLevel = place ?? level;
    const key = SlotKey.parse(`boost:${slotLevel}:${source}:${place === undefined ? index : 0}`);
    const options = boost.filter((attribute) => !fixed.includes(attribute));

    return [{ key, level: slotLevel, source, options, pick: offeredPick(document.build.choices[key], options) }];
  });

  return { level, source, fixed, slots };
}

/**
 * Boost sets already read, by content and build: they read the build's picks alone, never the level, and a build is
 * never changed in place, so a document at another level (the plan, read level by level) has the same ones.
 */
const BOOST_SETS = new WeakMap<BoostContent, WeakMap<CharacterDocument['build'], ReadonlyArray<BoostSet>>>();

/**
 * Every set of boosts the character has up to 20th level, lowest level first: its ancestry's, background's and
 * class's at 1st level, once each is picked, and four free boosts at 1st, 5th, 10th, 15th and 20th.
 */
export function boostSets(document: CharacterDocument, content: BoostContent): ReadonlyArray<BoostSet> {
  const byBuild = BOOST_SETS.get(content) ?? new WeakMap<CharacterDocument['build'], ReadonlyArray<BoostSet>>();
  BOOST_SETS.set(content, byBuild);
  const known = byBuild.get(document.build) ?? inLevelOrder(readBoostSets(document, content));
  byBuild.set(document.build, known);

  return known;
}

function readBoostSets(document: CharacterDocument, content: BoostContent): ReadonlyArray<BoostSet> {
  const ancestry = pickedId(document, ANCESTRY_SLOT);
  const background = pickedId(document, BACKGROUND_SLOT);
  const characterClass = pickedId(document, CLASS_SLOT);
  const ancestryBoosts = ancestry === undefined ? undefined : content.ancestry(ancestry)?.boosts;
  const backgroundBoosts = background === undefined ? undefined : content.background(background);
  const classKey = characterClass === undefined ? undefined : content.keyAttribute(characterClass);

  const keyAttribute =
    classKey === undefined ? undefined : [...new Set([...classKey, ...content.keyAttributeOptions(document)])];

  const secondClass = content.secondClass ? pickedId(document, SECOND_CLASS_SLOT) : undefined;
  const secondKey = secondClass === undefined ? undefined : content.keyAttribute(secondClass);

  const secondAttribute =
    secondKey === undefined ? undefined : [...new Set([...secondKey, ...content.keyAttributeOptions(document)])];

  const origins: Array<[BoostSource, ReadonlyArray<Boost> | undefined]> = [
    [BoostSource.Ancestry, ancestryBoosts],
    [BoostSource.Background, backgroundBoosts],
    [BoostSource.Class, keyAttribute === undefined ? undefined : [keyAttribute]],
    [BoostSource.SecondClass, secondAttribute === undefined ? undefined : [secondAttribute]],
  ];

  return [
    ...origins.flatMap(([source, boosts]) =>
      boosts === undefined ? [] : [boostSet(document, { level: FIRST_LEVEL, source, boosts })],
    ),
    boostSet(document, { level: FIRST_LEVEL, source: BoostSource.Free, boosts: FREE_BOOSTS }),
    ...FREE_BOOST_LEVELS.slice(1).map((level) =>
      boostSet(document, {
        level,
        source: BoostSource.Free,
        boosts: FREE_BOOSTS,
        places: content.gradual ? GRADUAL_BOOST_PLACES.get(level) : undefined,
      }),
    ),
    ...(content.apex
      ? [boostSet(document, { level: APEX_LEVEL, source: BoostSource.Apex, boosts: [FREE_BOOST] })]
      : []),
  ];
}

/** Every boost slot up to 20th level, filled or not. */
export function boostSlots(document: CharacterDocument, content: BoostContent): ReadonlyArray<BoostSlot> {
  return boostSets(document, content).flatMap((set) => set.slots);
}

/** The flaws of the character's ancestry; undefined while it has none picked, or its content isn't loaded. */
function ancestryFlaws(document: CharacterDocument, content: BoostContent): ReadonlyArray<Attribute> | undefined {
  const ancestry = pickedId(document, ANCESTRY_SLOT);

  return ancestry === undefined ? undefined : content.ancestry(ancestry)?.flaws;
}

/**
 * The character's voluntary flaw slots: one per attribute its ancestry doesn't flaw already, so each lowers a different
 * one. None until its ancestry is picked and loaded.
 */
export function flawSlots(document: CharacterDocument, content: BoostContent): ReadonlyArray<FlawSlot> {
  const own = ancestryFlaws(document, content);

  if (own === undefined) {
    return [];
  }

  const options = ATTRIBUTES.filter((attribute) => !own.includes(attribute));

  return options.map((_option, index): FlawSlot => {
    const key = SlotKey.parse(`flaw:${FIRST_LEVEL}:${BoostSource.Ancestry}:${index}`);

    return { key, options, pick: offeredPick(document.build.choices[key], options) };
  });
}

/** What one set raises: its fixed attributes and its slots' picks, each once. */
function raised(set: BoostSet): ReadonlySet<Attribute> {
  return new Set([...set.fixed, ...set.slots.flatMap((slot) => slot.pick ?? [])]);
}

/** The part of `set` taken by `level`: all of it from the set's level, or the boosts of a gradual set taken so far. */
function takenBy(set: BoostSet, level: Level): ReadonlyArray<BoostSet> {
  if (set.level <= level) {
    return [set];
  }

  const slots = set.slots.filter((slot) => slot.level <= level);

  return slots.length === 0 ? [] : [{ ...set, slots }];
}

/**
 * The attribute modifiers the character's picks give at its level, from its ancestry's flaws, its voluntary flaws and
 * every boost. Sets above the character's level are the plan, and don't count yet.
 */
export function attributeModifiers(document: CharacterDocument, content: BoostContent): AttributeModifiers {
  const voluntary = flawSlots(document, content).flatMap((slot) => slot.pick ?? []);
  const flaws = new Set([...(ancestryFlaws(document, content) ?? []), ...voluntary]);
  const current = boostSets(document, content).flatMap((set) => takenBy(set, document.level));

  const wire = Object.fromEntries(
    ATTRIBUTES.map((attribute) => [
      attribute,
      modifierOf(
        flaws.has(attribute),
        current
          .filter((set) => raised(set).has(attribute))
          .map(({ source }) => (source === BoostSource.Apex ? BoostKind.Apex : BoostKind.Regular)),
      ),
    ]),
  );

  return new AttributeModifiers(AttributeModifiersWire.parse(wire));
}
