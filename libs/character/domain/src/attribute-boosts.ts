import {
  AncestryId,
  Attribute,
  AttributeModifier,
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

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { ANCESTRY_SLOT, BACKGROUND_SLOT, CLASS_SLOT } from './character-slots';

/** Where a set of boosts comes from: the character's ancestry, background or class, or its level. */
export const BoostSource = {
  Ancestry: 'ancestry',
  Background: 'background',
  Class: 'class',
  Free: 'free',
} as const;
export type BoostSource = ValueOf<typeof BoostSource>;

/** One boost, as the attributes it may raise: all six for a free boost, one for a fixed boost. */
export type Boost = readonly Attribute[];

/** An ancestry's boosts, and the attributes it lowers. */
export interface AncestryBoosts {
  readonly boosts: readonly Boost[];
  readonly flaws: readonly Attribute[];
}

/** What boosts are read from: the boosts of each ancestry, background and class, by id. */
export interface BoostContent {
  readonly ancestry: (id: ContentId) => AncestryBoosts | undefined;
  readonly background: (id: ContentId) => readonly Boost[] | undefined;
  readonly keyAttribute: (id: ContentId) => Boost | undefined;
}

/** A boost the player places: one slot, what it may raise, and what it raises. */
export interface BoostSlot {
  readonly key: SlotKey;
  readonly level: Level;
  readonly source: BoostSource;
  /** What the boost allows, less what the fixed boosts of its set already raise. */
  readonly options: readonly Attribute[];
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: Attribute | undefined;
}

/** Boosts given together, which must each raise a different attribute: those with one option, and the slots. */
export interface BoostSet {
  readonly level: Level;
  readonly source: BoostSource;
  readonly fixed: readonly Attribute[];
  readonly slots: readonly BoostSlot[];
}

const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);
/** A free boost may raise any attribute. */
const FREE_BOOST: Boost = ATTRIBUTES;
const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);
/** Free boosts come at 1st level and every fifth level after (Player Core), four at a time. */
const FREE_BOOST_INTERVAL = 5;
const FREE_BOOSTS_PER_LEVEL = 4;
const FREE_BOOST_LEVELS: readonly Level[] = [
  FIRST_LEVEL,
  ...Array.from({ length: CHARACTER_LEVEL_MAX / FREE_BOOST_INTERVAL }, (_unused, index) =>
    Level.parse((index + 1) * FREE_BOOST_INTERVAL),
  ),
];
const FREE_BOOSTS: readonly Boost[] = Array.from({ length: FREE_BOOSTS_PER_LEVEL }, () => FREE_BOOST);
/** A boost to a modifier this high or higher is partial: two partial boosts raise it by one. */
const PARTIAL_BOOST_FROM = 4;

/** The boosts of the registry's ancestries, and of the backgrounds and classes its packs hold as entries. */
export function boostContent(registry: ContentRegistry): BoostContent {
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
    background: (id: ContentId): readonly Boost[] | undefined => backgrounds.get(id),
    keyAttribute: (id: ContentId): Boost | undefined => classes.get(id),
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
function offeredPick(value: ChoiceValue | undefined, options: readonly Attribute[]): Attribute | undefined {
  const parsed = AttributeSchema.safeParse(value);
  return parsed.success && options.includes(parsed.data) ? parsed.data : undefined;
}

/** Boosts given together: at what level, from where, and what each may raise. */
interface BoostOrigin {
  readonly level: Level;
  readonly source: BoostSource;
  readonly boosts: readonly Boost[];
}

/**
 * One set of boosts: a boost with one option is fixed, every other is a slot keyed `boost:<level>:<source>:<n>`,
 * `n` its place among the set's boosts. A slot offers what its boost allows less the set's fixed attributes.
 */
function boostSet(document: CharacterDocument, { level, source, boosts }: BoostOrigin): BoostSet {
  const fixed = boosts.flatMap((boost) => (boost.length === 1 ? boost : []));
  const slots = boosts.flatMap((boost, index): BoostSlot[] => {
    if (boost.length === 1) {
      return [];
    }
    const key = SlotKey.parse(`boost:${level}:${source}:${index}`);
    const options = boost.filter((attribute) => !fixed.includes(attribute));
    return [{ key, level, source, options, pick: offeredPick(document.build.choices[key], options) }];
  });
  return { level, source, fixed, slots };
}

/**
 * Every set of boosts the character has up to 20th level, lowest level first: its ancestry's, background's and
 * class's at 1st level, once each is picked, and four free boosts at 1st, 5th, 10th, 15th and 20th.
 */
export function boostSets(document: CharacterDocument, content: BoostContent): readonly BoostSet[] {
  const ancestry = pickedId(document, ANCESTRY_SLOT);
  const background = pickedId(document, BACKGROUND_SLOT);
  const characterClass = pickedId(document, CLASS_SLOT);
  const ancestryBoosts = ancestry === undefined ? undefined : content.ancestry(ancestry)?.boosts;
  const backgroundBoosts = background === undefined ? undefined : content.background(background);
  const keyAttribute = characterClass === undefined ? undefined : content.keyAttribute(characterClass);
  const origins: [BoostSource, readonly Boost[] | undefined][] = [
    [BoostSource.Ancestry, ancestryBoosts],
    [BoostSource.Background, backgroundBoosts],
    [BoostSource.Class, keyAttribute === undefined ? undefined : [keyAttribute]],
  ];
  return [
    ...origins.flatMap(([source, boosts]) =>
      boosts === undefined ? [] : [boostSet(document, { level: FIRST_LEVEL, source, boosts })],
    ),
    ...FREE_BOOST_LEVELS.map((level) => boostSet(document, { level, source: BoostSource.Free, boosts: FREE_BOOSTS })),
  ];
}

/** Every boost slot up to 20th level, filled or not. */
export function boostSlots(document: CharacterDocument, content: BoostContent): readonly BoostSlot[] {
  return boostSets(document, content).flatMap((set) => set.slots);
}

/** What one set raises: its fixed attributes and its slots' picks, each once. */
function raised(set: BoostSet): ReadonlySet<Attribute> {
  return new Set([...set.fixed, ...set.slots.flatMap((slot) => slot.pick ?? [])]);
}

/**
 * One attribute's modifier: +0, or -1 with a flaw, then one more for each set that raises it, in level order. From
 * +4 a boost is partial, and the second partial boost raises it by one (Player Core).
 */
function modifierOf(attribute: Attribute, flawed: boolean, sets: readonly BoostSet[]): AttributeModifier {
  let total = flawed ? -1 : 0;
  let partial = false;
  const boosts = sets.filter((set) => raised(set).has(attribute)).length;
  for (let boost = 0; boost < boosts; boost += 1) {
    if (total < PARTIAL_BOOST_FROM || partial) {
      total += 1;
      partial = false;
    } else {
      partial = true;
    }
  }
  return AttributeModifier.parse(total);
}

/**
 * The attribute modifiers the character's picks give at its level, from its ancestry's flaws and every boost. Sets
 * above the character's level are the plan, and don't count yet.
 */
export function attributeModifiers(document: CharacterDocument, content: BoostContent): AttributeModifiers {
  const ancestry = pickedId(document, ANCESTRY_SLOT);
  const flaws = ancestry === undefined ? [] : (content.ancestry(ancestry)?.flaws ?? []);
  const current = boostSets(document, content).filter((set) => set.level <= document.level);
  const wire = Object.fromEntries(
    ATTRIBUTES.map((attribute) => [attribute, modifierOf(attribute, flaws.includes(attribute), current)]),
  );
  return new AttributeModifiers(AttributeModifiersWire.parse(wire));
}
