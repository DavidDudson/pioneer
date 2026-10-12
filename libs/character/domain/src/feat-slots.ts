import type { ChoiceSlot, ContentLookup, GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import {
  Attribute,
  ContentId,
  ContentKind,
  Level,
  NamespaceKind,
  Proficiency,
  RollOption,
  RollOptionNamespace,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentLevel, ContentText, RichText, SlotKey } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { attributeModifiers } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { FeatPickProblem } from './feat-content';
import type { FeatContent, FeatRead } from './feat-content';
import { rankOptions } from './language-levels';
import { grantedSkillRanks, skillSlots, slotSkillRanks, withSkillPicks } from './skill-training';
import { skillReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

/**
 * Whether a character meets a feat's prerequisites (#466), under Kleene's logic (ADR-0002): met, not met, or unknown
 * when they are printed but don't parse, or read a fact nobody has supplied.
 */
export const PrerequisiteStatus = { Met: 'met', Unmet: 'unmet', Unknown: 'unknown' } as const;
export type PrerequisiteStatus = ValueOf<typeof PrerequisiteStatus>;

const STATUSES: Readonly<Record<Truth, PrerequisiteStatus>> = {
  [Truth.True]: PrerequisiteStatus.Met,
  [Truth.False]: PrerequisiteStatus.Unmet,
  [Truth.Unknown]: PrerequisiteStatus.Unknown,
};

/**
 * How `feat`'s prerequisites read against `facts`: by its predicate; unknown when it has printed prerequisites the
 * importer couldn't parse; met when it has none.
 */
function prerequisiteStatus(feat: FeatRead | undefined, facts: PredicateFacts): PrerequisiteStatus {
  if (feat?.predicate !== undefined) {
    return STATUSES[evaluatePredicate(feat.predicate, facts)];
  }
  return feat?.prerequisites === undefined ? PrerequisiteStatus.Met : PrerequisiteStatus.Unknown;
}

/**
 * The namespaces prerequisites read that only these facts set, so a missing one is false: `attribute:str:mod:2` and
 * `perception:rank:3`. The engine sets neither, so they stay unknown in the core table.
 */
const PREREQUISITE_NAMESPACES: readonly RollOptionNamespace[] = [
  RollOptionNamespace.parse('attribute'),
  RollOptionNamespace.parse('perception'),
];

const RANKS: readonly Proficiency[] = Object.values(Proficiency);
const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);
const PERCEPTION = 'perception';

function prerequisiteNamespaces(namespaces: NamespaceTable): NamespaceTable {
  return new Map([...namespaces, ...PREREQUISITE_NAMESPACES.map((each) => [each, NamespaceKind.Known] as const)]);
}

/** The higher of two ranks. */
function higherRank(left: Proficiency | undefined, right: Proficiency): Proficiency {
  return left === undefined || RANKS.indexOf(right) > RANKS.indexOf(left) ? right : left;
}

/** `perception:rank:<n>` for the highest rank the effective set's `Proficiency` elements give Perception. */
function perceptionOptions({ items, facts }: GrantResolution): RollOption[] {
  let rank: Proficiency | undefined = undefined;
  for (const { entry } of items) {
    for (const element of entry.rules) {
      const raises =
        element.key === RuleElementKey.Proficiency &&
        element.selector === PERCEPTION &&
        (element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True);
      if (raises) {
        rank = higherRank(rank, element.rank);
      }
    }
  }
  return rank === undefined ? [] : [RollOption.parse(`${PERCEPTION}:rank:${RANKS.indexOf(rank)}`)];
}

/**
 * `attribute:<attribute>:mod:<n>` for each modifier at `level`, as Foundry writes them. A negative one can't be written
 * as a roll option, and no prerequisite asks for one, so it sets none: a minimum then reads as not met.
 */
function attributeOptions(document: CharacterDocument, content: SlotContent, level: Level): RollOption[] {
  const modifiers = attributeModifiers({ ...document, level }, content.boosts);
  return ATTRIBUTES.flatMap((attribute) => {
    const modifier = modifiers.get(attribute);
    return modifier < 0 ? [] : [RollOption.parse(`attribute:${attribute}:mod:${modifier}`)];
  });
}

/**
 * What a character's prerequisites read: the feats, the facts at each level, and the lowest level each of its feat
 * slots opens.
 */
export interface PrerequisiteReads {
  readonly feats: FeatContent;
  readonly factsAt: (level: Level) => PredicateFacts;
  /** Each feat slot the character has at some level up to 20th, by the lowest level it opens at. */
  readonly featSlotLevels: ReadonlyMap<SlotKey, Level>;
}

function levelsUp(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MIN + index));
}

/** Whether `slot` is a `ChoiceSet` querying feats: an ancestry, class, skill or general feat slot, or a feature's. */
function isFeatSlot(slot: ChoiceSlot, lookup: ContentLookup): boolean {
  const element = lookup.entry(slot.origin.entry)?.rules[slot.rule];
  return (
    element?.key === RuleElementKey.ChoiceSet &&
    !Array.isArray(element.choices) &&
    element.choices.kind === ContentKind.Feat
  );
}

/** The facts at each level, each read once: what prerequisites read, as `prerequisiteReads` lists it. */
function factsByLevel(document: CharacterDocument, content: SlotContent): (level: Level) => PredicateFacts {
  const skills = skillReads(document, content);
  const slots = skillSlots(document, skills);
  const namespaces = prerequisiteNamespaces(content.namespaces);
  const facts = new Map<Level, PredicateFacts>();
  const read = (level: Level): PredicateFacts => {
    const resolution = skills.grantsAt(level);
    const ranks = withSkillPicks(grantedSkillRanks(resolution), slotSkillRanks(slots, level));
    const options = [
      ...resolution.rollOptions,
      ...rankOptions(ranks),
      ...perceptionOptions(resolution),
      ...attributeOptions(document, content, level),
    ];
    return new PredicateFacts(options, namespaces);
  };
  return (level) => {
    const known = facts.get(level) ?? read(level);
    facts.set(level, known);
    return known;
  };
}

/** Each feat slot the character has up to 20th level, by the lowest level it opens at. */
function featSlotLevelsOf(document: CharacterDocument, content: SlotContent): ReadonlyMap<SlotKey, Level> {
  const { grantsAt } = skillReads(document, content);
  const levels = new Map<SlotKey, Level>();
  for (const level of levelsUp()) {
    const resolution = grantsAt(level);
    for (const slot of [...resolution.open, ...resolution.answered]) {
      if (!levels.has(slot.key) && isFeatSlot(slot, content.lookup)) {
        levels.set(slot.key, level);
      }
    }
  }
  return levels;
}

/** Reads already made, by content and document: documents and content are never changed in place. */
const READS = new WeakMap<SlotContent, WeakMap<CharacterDocument, PrerequisiteReads>>();

/**
 * What the character's feat prerequisites read at each level: its roll options there (its feats, features, ancestry,
 * heritage, class, deity, traits and level), its skill and Lore ranks with its skill picks up to that level, its
 * Perception rank and its attribute modifiers. Read once for the same content and document.
 */
export function prerequisiteReads(document: CharacterDocument, content: SlotContent): PrerequisiteReads {
  const byDocument = READS.get(content) ?? new WeakMap<CharacterDocument, PrerequisiteReads>();
  READS.set(content, byDocument);
  const reads = byDocument.get(document) ?? {
    feats: content.feats,
    factsAt: factsByLevel(document, content),
    featSlotLevels: featSlotLevelsOf(document, content),
  };
  byDocument.set(document, reads);
  return reads;
}

/** A pick for a feat slot. */
export interface FeatPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * What is wrong with a pick for a feat slot, read at the level the slot opens: a feat above that level, or one whose
 * prerequisites are not met there. Undefined for a pick that is fine, isn't a loaded feat, or a slot that isn't a feat
 * slot.
 */
export function featPickProblem(reads: PrerequisiteReads, { slot, selection }: FeatPick): FeatPickProblem | undefined {
  const level = reads.featSlotLevels.get(slot);
  const id = ContentId.safeParse(selection);
  const feat = level === undefined || !id.success ? undefined : reads.feats.feat(id.data);
  if (level === undefined || feat === undefined) {
    return undefined;
  }
  if (feat.level > level) {
    return FeatPickProblem.TooHigh;
  }
  const unmet = prerequisiteStatus(feat, reads.factsAt(level)) === PrerequisiteStatus.Unmet;
  return unmet ? FeatPickProblem.Prerequisites : undefined;
}

/** A feat a feat slot offers, with whether the character meets its prerequisites at the slot's level. */
export interface FeatOption {
  readonly value: ContentId;
  readonly label: ContentText;
  readonly level: ContentLevel;
  readonly status: PrerequisiteStatus;
  /** As printed, for saying what is not met or can't be checked. */
  readonly prerequisites: RichText | undefined;
}

/** A feat slot: its key, the level it opens at, where it comes from, and the feats it offers there. */
export interface FeatSlot {
  readonly key: SlotKey;
  readonly level: Level;
  readonly entry: ContentId;
  readonly prompt: ContentText | undefined;
  /** Worked out the first time it is read. */
  readonly options: readonly FeatOption[];
}

function featOptions(slot: ChoiceSlot, content: SlotContent, facts: PredicateFacts): FeatOption[] {
  return slot.options.flatMap((option): FeatOption[] => {
    const id = ContentId.safeParse(option.value);
    const feat = id.success ? content.feats.feat(id.data) : undefined;
    if (!id.success || feat === undefined) {
      return [];
    }
    const status = prerequisiteStatus(feat, facts);
    return [{ value: id.data, label: option.label, level: feat.level, status, prerequisites: feat.prerequisites }];
  });
}

/**
 * Every feat slot the character has up to 20th level, lowest level first, each read at the level it opens: it offers
 * the feats of its kind up to that level, each met, not met or unknown over the character's facts there (#466). A
 * feat whose prerequisites aren't met is still offered, so the picker can say why it can't be taken.
 */
export function featSlots(document: CharacterDocument, content: SlotContent): readonly FeatSlot[] {
  const reads = prerequisiteReads(document, content);
  const grants = skillReads(document, content);
  return [...reads.featSlotLevels]
    .toSorted(([, left], [, right]) => left - right)
    .flatMap(([key, level]): FeatSlot[] => {
      const resolution = grants.grantsAt(level);
      const slot = [...resolution.open, ...resolution.answered].find((each) => each.key === key);
      if (slot === undefined) {
        return [];
      }
      let options: readonly FeatOption[] | undefined = undefined;
      return [
        {
          key,
          level,
          entry: slot.origin.entry,
          prompt: slot.prompt,
          get options(): readonly FeatOption[] {
            options ??= featOptions(slot, content, reads.factsAt(level));
            return options;
          },
        },
      ];
    });
}
