import type { ChoiceSlot, ContentLookup } from '@pioneer/rules/grants';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { ContentId, ContentKind, Level, RuleElementKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentLevel, ContentText, RichText, SlotKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { dedicationWait, dedicationWaits, featsTaken, NO_DEDICATION_LOCK, slotsInOrder } from './dedication-lock';
import type { DedicationWait } from './dedication-lock';
import { FeatPickProblem } from './feat-content';
import type { FeatContent } from './feat-content';
import { rankOptions } from './language-levels';
import { bisected } from './level-bisect';
import { prerequisiteClauseStatuses, PrerequisiteStatus, prerequisiteStatus } from './prerequisite-status';
import type { PrerequisiteClauseStatus } from './prerequisite-status';
import { grantedSkillRanks } from './skill-raises';
import { skillSlots, slotSkillRanks, withSkillPicks } from './skill-training';
import { skillReads } from './slot-reads';
import type { SlotContent } from './slot-reads';

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

/**
 * Whether `slot` is a `ChoiceSet` of feats: one querying them (an ancestry, class, skill or general feat slot, or a
 * feature's), or one listing only feats (Voice of Nature's Animal Empathy or Plant Empathy).
 */
function isFeatSlot(slot: ChoiceSlot, lookup: ContentLookup): boolean {
  const element = lookup.entry(slot.origin.entry)?.rules[slot.rule];
  if (element?.key !== RuleElementKey.ChoiceSet) {
    return false;
  }
  if (!Array.isArray(element.choices)) {
    return 'kind' in element.choices && element.choices.kind === ContentKind.Feat;
  }
  return (
    element.choices.length > 0 &&
    element.choices.every(({ value }) => {
      const id = ContentId.safeParse(value);
      return id.success && lookup.entry(id.data)?.kind === ContentKind.Feat;
    })
  );
}

/** The facts at each level, each read once: what prerequisites read, as `prerequisiteReads` lists it. */
function factsByLevel(document: CharacterDocument, content: SlotContent): (level: Level) => PredicateFacts {
  const skills = skillReads(document, content);
  const slots = skillSlots(document, skills);
  const facts = new Map<Level, PredicateFacts>();
  const read = (level: Level): PredicateFacts => {
    const resolution = skills.grantsAt(level);
    const ranks = withSkillPicks(grantedSkillRanks(resolution), slotSkillRanks(slots, level));
    const options = [...resolution.rollOptions, ...rankOptions(ranks)];
    return new PredicateFacts(options, content.namespaces);
  };
  return (level) => {
    const known = facts.get(level) ?? read(level);
    facts.set(level, known);
    return known;
  };
}

/** The keys of the feat slots the character has at each level, a set that only grows with the level. */
function featSlotsAt(document: CharacterDocument, content: SlotContent): (level: Level) => ReadonlySet<SlotKey> {
  const { grantsAt } = skillReads(document, content);
  return bisected(
    (level) => {
      const resolution = grantsAt(level);
      const slots = [...resolution.open, ...resolution.answered].filter((slot) => isFeatSlot(slot, content.lookup));
      return new Set(slots.map(({ key }) => key));
    },
    (left, right) => left.size === right.size && [...left].every((key) => right.has(key)),
    { first: Level.parse(CHARACTER_LEVEL_MIN), last: Level.parse(CHARACTER_LEVEL_MAX) },
  );
}

/** Each feat slot the character has up to 20th level, by the lowest level it opens at. */
function featSlotLevelsOf(document: CharacterDocument, content: SlotContent): ReadonlyMap<SlotKey, Level> {
  const slotsAt = featSlotsAt(document, content);
  const levels = new Map<SlotKey, Level>();
  for (const level of levelsUp()) {
    for (const key of slotsAt(level)) {
      if (!levels.has(key)) {
        levels.set(key, level);
      }
    }
  }
  return levels;
}

/** Reads already made, by content and document: documents and content are never changed in place. */
const READS = new WeakMap<SlotContent, WeakMap<CharacterDocument, PrerequisiteReads>>();

function readPrerequisites(document: CharacterDocument, content: SlotContent): PrerequisiteReads {
  const featSlotLevels = featSlotLevelsOf(document, content);
  const factsAt = factsByLevel(document, content);
  const order = slotsInOrder(featSlotLevels);
  const { grantsAt } = skillReads(document, content);
  const slotKeys = new Set(featSlotLevels.keys());
  const waits = new Map<SlotKey, readonly DedicationWait[]>();
  const waitsAt = (slot: SlotKey): readonly DedicationWait[] => {
    const level = featSlotLevels.get(slot);
    const unlocked = level === undefined || factsAt(level).has(NO_DEDICATION_LOCK);
    const earlier = order.slice(0, order.indexOf(slot));
    const taken = unlocked
      ? []
      : featsTaken(document.build.choices, content.feats, {
          earlier,
          granted: { items: grantsAt(level).items, featSlots: slotKeys },
        });
    const known = waits.get(slot) ?? dedicationWaits(content.feats, taken);
    waits.set(slot, known);
    return known;
  };
  return { feats: content.feats, factsAt, featSlotLevels, waitsAt };
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
 * What is wrong with a pick for a feat slot, read at the level the slot opens: a feat above that level, a dedication
 * while an earlier one waits on its archetype's feats (#467), or a feat whose prerequisites are not met there, in that
 * order, as the picker says them. Undefined for a pick that is fine, isn't a loaded feat, or a slot that isn't a feat
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
  if (dedicationWait(reads.feats, reads.waitsAt(slot), id.data) !== undefined) {
    return FeatPickProblem.DedicationLocked;
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
  /** Each clause of the prerequisites with its own state, for a feat with several; undefined for any other. */
  readonly clauses: readonly PrerequisiteClauseStatus[] | undefined;
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
    const clauses = prerequisiteClauseStatuses(feat, facts);
    const locked = dedicationWait(reads.feats, waits, id.data);
    return [
      {
        value: id.data,
        label: option.label,
        level: feat.level,
        status,
        clauses,
        prerequisites: feat.prerequisites,
        locked,
      },
    ];
  });
}

/**
 * `document` with `slot` empty: how a slot reads what may go in it, so the pick it would replace counts for nothing.
 * An empty slot is `document` itself, so its reads (cached per document) are shared rather than made again for each.
 */
export function withoutPick(document: CharacterDocument, slot: SlotKey): CharacterDocument {
  if (!(slot in document.build.choices)) {
    return document;
  }
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
