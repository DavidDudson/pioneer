import type { ChoiceSlot, ContentLookup } from '@pioneer/rules/grants';
import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import {
  Attribute,
  ContentId,
  ContentKind,
  Level,
  NamespaceKind,
  RollOption,
  RollOptionNamespace,
  RuleElementKey,
} from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentLevel, ContentText, RichText, SlotKey } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { attributeModifiers } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { dedicationWait, dedicationWaits, featsPicked } from './dedication-lock';
import type { DedicationWait } from './dedication-lock';
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
 * The namespaces prerequisites read that only these facts set, so a missing one is false: `attribute:str:mod:2`. The
 * engine doesn't set it, so it stays unknown in the core table. Perception ranks aren't read at all, so a Perception
 * prerequisite stays unknown: the import drops some features that raise Perception (Perception Expertise), and any
 * rank given would settle the comparison (ADR-0002).
 */
const PREREQUISITE_NAMESPACES: readonly RollOptionNamespace[] = [RollOptionNamespace.parse('attribute')];

const ATTRIBUTES: readonly Attribute[] = Object.values(Attribute);

function prerequisiteNamespaces(namespaces: NamespaceTable): NamespaceTable {
  return new Map([...namespaces, ...PREREQUISITE_NAMESPACES.map((each) => [each, NamespaceKind.Known] as const)]);
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
  /** The dedications still waiting on their archetype's other feats when `slot` is read (#467). */
  readonly waitsAt: (slot: SlotKey) => readonly DedicationWait[];
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
    const options = [...resolution.rollOptions, ...rankOptions(ranks), ...attributeOptions(document, content, level)];
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

/** The feat slots in the order they are taken: lowest level first, and in the order they are found within a level. */
function slotsInOrder(levels: ReadonlyMap<SlotKey, Level>): SlotKey[] {
  return [...levels].toSorted(([, left], [, right]) => left - right).map(([key]) => key);
}

/** Reads already made, by content and document: documents and content are never changed in place. */
const READS = new WeakMap<SlotContent, WeakMap<CharacterDocument, PrerequisiteReads>>();

function readPrerequisites(document: CharacterDocument, content: SlotContent): PrerequisiteReads {
  const featSlotLevels = featSlotLevelsOf(document, content);
  const order = slotsInOrder(featSlotLevels);
  const waits = new Map<SlotKey, readonly DedicationWait[]>();
  const waitsAt = (slot: SlotKey): readonly DedicationWait[] => {
    const earlier = order.slice(0, order.indexOf(slot));
    const known =
      waits.get(slot) ?? dedicationWaits(content.feats, featsPicked(document.build.choices, content.feats, earlier));
    waits.set(slot, known);
    return known;
  };
  return { feats: content.feats, factsAt: factsByLevel(document, content), featSlotLevels, waitsAt };
}

/**
 * What the character's feat prerequisites read at each level: its roll options there (its feats, features, ancestry,
 * heritage, class, deity, traits and level), its skill and Lore ranks with its skill picks up to that level, and its
 * attribute modifiers; and, at each feat slot, the dedications still waiting on their archetype's feats (#467). Read
 * once for the same content and document.
 */
export function prerequisiteReads(document: CharacterDocument, content: SlotContent): PrerequisiteReads {
  const byDocument = READS.get(content) ?? new WeakMap<CharacterDocument, PrerequisiteReads>();
  READS.set(content, byDocument);
  const reads = byDocument.get(document) ?? readPrerequisites(document, content);
  byDocument.set(document, reads);
  return reads;
}

/** A pick for a feat slot. */
export interface FeatPick {
  readonly slot: SlotKey;
  readonly selection: ChoiceValue;
}

/**
 * What is wrong with a pick for a feat slot, read at the level the slot opens: a feat above that level, one whose
 * prerequisites are not met there, or a dedication while an earlier one waits on its archetype's feats (#467). Undefined for a pick that is fine, isn't a loaded feat, or a slot that isn't a feat
 * slot.
 */
export function featPickProblem(reads: PrerequisiteReads, { slot, selection }: FeatPick): FeatPickProblem | undefined {
  const level = reads.featSlotLevels.get(slot);
  const id = ContentId.safeParse(selection);
  const feat = level === undefined || !id.success ? undefined : reads.feats.feat(id.data);
  if (level === undefined || !id.success || feat === undefined) {
    return undefined;
  }
  if (feat.level > level) {
    return FeatPickProblem.TooHigh;
  }
  if (prerequisiteStatus(feat, reads.factsAt(level)) === PrerequisiteStatus.Unmet) {
    return FeatPickProblem.Prerequisites;
  }
  const locked = dedicationWait(reads.feats, reads.waitsAt(slot), id.data) !== undefined;
  return locked ? FeatPickProblem.DedicationLocked : undefined;
}

/** A feat a feat slot offers, with whether the character meets its prerequisites at the slot's level. */
export interface FeatOption {
  readonly value: ContentId;
  readonly label: ContentText;
  readonly level: ContentLevel;
  readonly status: PrerequisiteStatus;
  /** As printed, for saying what is not met or can't be checked. */
  readonly prerequisites: RichText | undefined;
  /** The dedication it waits on, for a dedication while an earlier one still needs its archetype's feats (#467). */
  readonly locked: DedicationWait | undefined;
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

function featOptions(slot: ChoiceSlot, level: Level, reads: PrerequisiteReads): FeatOption[] {
  const facts = reads.factsAt(level);
  const waits = reads.waitsAt(slot.key);
  return slot.options.flatMap((option): FeatOption[] => {
    const id = ContentId.safeParse(option.value);
    const feat = id.success ? reads.feats.feat(id.data) : undefined;
    if (!id.success || feat === undefined) {
      return [];
    }
    const status = prerequisiteStatus(feat, facts);
    const locked = dedicationWait(reads.feats, waits, id.data);
    return [
      { value: id.data, label: option.label, level: feat.level, status, prerequisites: feat.prerequisites, locked },
    ];
  });
}

/** `document` with `slot` empty: how a slot reads what may go in it, so the pick it would replace counts for nothing. */
export function withoutPick(document: CharacterDocument, slot: SlotKey): CharacterDocument {
  const { [slot]: _own, ...choices } = document.build.choices;
  return { ...document, build: { ...document.build, choices } };
}

/**
 * Every feat slot the character has up to 20th level, lowest level first, each read at the level it opens: it offers
 * the feats of its kind up to that level, each met, not met or unknown over the character's facts there with the slot itself empty, as `selectSlot`
 * reads it (#466). A feat whose prerequisites aren't met is still offered, so the picker can say why it can't be taken.
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
            options ??= featOptions(slot, level, prerequisiteReads(withoutPick(document, key), content));
            return options;
          },
        },
      ];
    });
}
