import { ranksInPlay } from '@pioneer/rules/engine';
import type { ClassInputs } from '@pioneer/rules/engine';
import type { ChoiceSlot, ContentLookup, GrantedItem, GrantResolution } from '@pioneer/rules/grants';
import {
  ContentKind,
  isPredicateComparison,
  Level,
  OriginHopKind,
  RuleElementKey,
  Selector,
  SlotKey,
} from '@pioneer/rules/sdk';
import type {
  ContentId,
  ContentRegistry,
  ContentText,
  HitPoints,
  Predicate,
  Proficiency,
  RuleElement,
  RuleIndex,
  Slug,
} from '@pioneer/rules/sdk';

import { boostSets, BoostSource } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CLASS_SLOT, SECOND_CLASS_SLOT } from './character-slots';
import { grantedRules } from './granted-rules';
import { pickedSkillRanks, withSkillPicks } from './skill-training';
import { resolveSlotsAt, skillReads, slotContextOf } from './slot-offer';
import type { SlotContent } from './slot-offer';

/** What the builder reads of a class beyond its rule elements: its Hit Points and the tag of its subclass options. */
interface ClassFacts {
  readonly hitPoints: HitPoints;
  readonly subclass?: Slug;
}

/** The classes the builder knows, by id. */
export interface ClassContent {
  readonly data: (id: ContentId) => ClassFacts | undefined;
}

/** The fields a class's data gives `ClassFacts`. */
interface ClassFields {
  readonly hitPoints: HitPoints;
  readonly subclass?: Slug | undefined;
}

function factsOf({ hitPoints, subclass }: ClassFields): ClassFacts {
  return subclass === undefined ? { hitPoints } : { hitPoints, subclass };
}

/** The classes of the registry's packs, by id. */
export function classContent(registry: ContentRegistry): ClassContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  const classes = new Map(
    entries.flatMap((entry) => (entry.kind === ContentKind.Class ? [[entry.id, factsOf(entry.data)] as const] : [])),
  );
  return { data: (id: ContentId): ClassFacts | undefined => classes.get(id) };
}

/** The character's grants at its own level, over every pick it holds: its effective set. */
export function characterGrants(document: CharacterDocument, content: SlotContent): GrantResolution {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  return resolveSlotsAt(Level.parse(document.level), slotContextOf(document, content, picks));
}

const AC = Selector.parse('ac');
const UNARMORED = Selector.parse('defense:unarmored');

/**
 * The rank of each statistic the effective set's `Proficiency` elements raise: the class's starting ranks, a
 * background's skills, a feature's later raise. Armor Class takes the unarmored defense rank, as nothing is worn until
 * the inventory epic equips armor.
 */
export function characterRanks(resolution: GrantResolution): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map(ranksInPlay({ rules: grantedRules(resolution), facts: resolution.facts }));
  const unarmored = ranks.get(UNARMORED);
  if (unarmored !== undefined && !ranks.has(AC)) {
    ranks.set(AC, unarmored);
  }
  return ranks;
}

/** The class's id, when `slot` (the class slot, or the second class's) holds a class the content has. */
function classOf(resolution: GrantResolution, slot: SlotKey): ContentId | undefined {
  return resolution.rootSlots.find((each) => each.key === slot)?.pick;
}

/**
 * What the class gives the engine: its Hit Points, and the key attribute, the one it allows or the one picked of
 * those. Undefined until both are known.
 */
export function classInputs(
  document: CharacterDocument,
  content: SlotContent,
  classes: ClassContent,
): ClassInputs | undefined {
  const picked = characterGrants(document, content);
  const id = classOf(picked, CLASS_SLOT);
  const data = id === undefined ? undefined : classes.data(id);
  const set = boostSets(document, content.boosts).find((each) => each.source === BoostSource.Class);
  const keyAttribute = set?.fixed[0] ?? set?.slots[0]?.pick;
  return data === undefined || keyAttribute === undefined ? undefined : { hitPoints: data.hitPoints, keyAttribute };
}

/** A class feature on the character: its entry, and the class and class level it came from. */
export interface ClassFeature {
  readonly id: ContentId;
  readonly name: ContentText;
  readonly className: ContentText;
  readonly level: Level;
}

const FIRST_LEVEL = Level.parse(1);
const SELF_LEVEL = 'self:level';

/** The level `{ "gte": ["self:level", n] }` in `predicate` names, 1st when it names none. */
function levelOf(predicate: Predicate | undefined): Level {
  for (const statement of predicate ?? []) {
    if (isPredicateComparison(statement) && 'gte' in statement) {
      const [option, level] = statement.gte;
      if (option === SELF_LEVEL && typeof level === 'number') {
        return Level.parse(level);
      }
    }
  }
  return FIRST_LEVEL;
}

/** The class rule behind `item`: the rule of the first grant the class made, if the item came through it. */
function classRule(item: GrantedItem, classId: ContentId): RuleIndex | undefined {
  for (const hop of item.origin.hops) {
    if (hop.kind === OriginHopKind.Grant && hop.by === classId) {
      return hop.rule;
    }
  }
  return undefined;
}

/**
 * The class features the character has at its level, each with the class level its grant opens at: "from Cleric,
 * level 1". A subclass's feature (a doctrine) reads the level of the class feature that offered it. In class level,
 * then name order. Those of `slot`'s class: the first class's unless the second's is asked for.
 */
export function classFeatures(
  resolution: GrantResolution,
  lookup: ContentLookup,
  slot: SlotKey = CLASS_SLOT,
): readonly ClassFeature[] {
  const classId = classOf(resolution, slot);
  const characterClass = classId === undefined ? undefined : lookup.entry(classId);
  if (classId === undefined || characterClass === undefined) {
    return [];
  }
  const features = resolution.items.flatMap((item): ClassFeature[] => {
    const rule = item.entry.kind === ContentKind.ClassFeature ? classRule(item, classId) : undefined;
    if (rule === undefined) {
      return [];
    }
    const level = levelOf(characterClass.rules[rule]?.predicate);
    return [{ id: item.entry.id, name: item.entry.name, className: characterClass.name, level }];
  });
  return features.toSorted((left, right) => left.level - right.level || left.name.localeCompare(right.name));
}

/** Whether `element` is a `ChoiceSet` querying class features tagged `tag`. */
function queriesTag(element: RuleElement | undefined, tag: Slug): boolean {
  if (element?.key !== RuleElementKey.ChoiceSet || Array.isArray(element.choices)) {
    return false;
  }
  const wanted = `item:tag:${tag}`;
  return element.choices.kind === ContentKind.ClassFeature && element.choices.filter.some((term) => term === wanted);
}

/** The `ChoiceSet` of `resolution` that queries class features tagged `subclass`; undefined without a tag. */
function subclassChoice(
  resolution: GrantResolution,
  lookup: ContentLookup,
  subclass: Slug | undefined,
): ChoiceSlot | undefined {
  if (subclass === undefined) {
    return undefined;
  }
  const slots: readonly ChoiceSlot[] = [...resolution.answered, ...resolution.open];
  return slots.find((each) => queriesTag(lookup.entry(each.origin.entry)?.rules[each.rule], subclass));
}

/** The `subclass` tag of the class picked for `slot`, if any. */
function subclassTag(resolution: GrantResolution, classes: ClassContent, slot: SlotKey): Slug | undefined {
  const classId = classOf(resolution, slot);
  return classId === undefined ? undefined : classes.data(classId)?.subclass;
}

/**
 * The class's subclass slot (a doctrine, muse, order or school): the `ChoiceSet` on the character that queries the
 * class features tagged with the class's `subclass`. Undefined for a class without one, or before a class is picked.
 */
export function subclassSlot(
  resolution: GrantResolution,
  lookup: ContentLookup,
  classes: ClassContent,
): ChoiceSlot | undefined {
  return subclassChoice(resolution, lookup, subclassTag(resolution, classes, CLASS_SLOT));
}

/** The subclass slot of the second class, read as `subclassSlot` reads the first's. */
export function secondSubclassSlot(
  resolution: GrantResolution,
  lookup: ContentLookup,
  classes: ClassContent,
): ChoiceSlot | undefined {
  return subclassChoice(resolution, lookup, subclassTag(resolution, classes, SECOND_CLASS_SLOT));
}

/**
 * Every rank the build gives at the character's level: those its effective set raises (`characterRanks`), and the
 * skills its trained skill and skill increase picks raise, the higher of the two for each.
 */
export function buildRanks(document: CharacterDocument, content: SlotContent): ReadonlyMap<Selector, Proficiency> {
  const granted = characterRanks(characterGrants(document, content));
  return withSkillPicks(granted, pickedSkillRanks(document, skillReads(document, content)));
}
