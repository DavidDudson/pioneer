import type { AnsweredSlot, ChoiceSlot, ContentLookup, GrantResolution, RootSlot } from '@pioneer/rules/grants';
import { ContentId, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentText, RollOption } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { boostSets, flawSlots } from './attribute-boosts';
import type { BoostSet, BoostSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX } from './character-fields';
import { SlotInvalidMessage, SlotStatus, SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';
import { OPTIONAL_ROOT_SLOTS } from './character-slots';
import { FeatPickProblem } from './feat-content';
import { featPickProblem, prerequisiteReads } from './feat-slots';
import { languageStatuses } from './language-slot-status';
import { preparedStatuses, signatureStatuses } from './prepared-slot-status';
import { SkillPickProblem, skillSlots } from './skill-training';
import { resolveSlotsAt, skillReads } from './slot-offer';
import type { SlotContent, SlotContext } from './slot-offer';
import { invalidReason, invalidSlot, named, validSlot } from './slot-read';
import type { SlotRead } from './slot-read';

/** A boost slot: invalid when its pick isn't on offer, or another boost of its set took the attribute first. */
function boostStatus(set: BoostSet, slot: BoostSlot, read: SlotRead): CharacterSlot {
  const { stored } = read;
  if (stored === undefined) {
    return validSlot(read, undefined);
  }
  if (slot.pick === undefined) {
    return invalidSlot(read, stored, message(SlotInvalidMessage.NotOffered));
  }
  const earlier = set.slots.slice(0, set.slots.indexOf(slot));
  const taken = earlier.some((other) => other.pick === slot.pick);
  return taken ? invalidSlot(read, stored, message(SlotInvalidMessage.BoostTaken)) : validSlot(read, undefined);
}

function rootStatus(slot: RootSlot, read: SlotRead, lookup: ContentLookup): CharacterSlot {
  if (read.stored !== undefined && slot.pick === undefined) {
    return invalidSlot(read, read.stored, invalidReason(read.stored, lookup));
  }
  return validSlot(read, slot.pick === undefined ? undefined : lookup.entry(slot.pick)?.name);
}

/** The name of a `ChoiceSet` pick: the entry it names, else the listed option. */
function choiceName(slot: AnsweredSlot, lookup: ContentLookup): ContentText | undefined {
  const isId = ContentId.safeParse(slot.pick).success;
  return isId ? entryName(slot.pick, lookup) : slot.options.find((option) => option.value === slot.pick)?.label;
}

function choiceSubject(slot: ChoiceSlot, lookup: ContentLookup): SlotSubject {
  const name = lookup.entry(slot.origin.entry)?.name;
  return {
    kind: SlotSubjectKind.Choice,
    entry: slot.origin.entry,
    ...(name === undefined ? {} : { entryName: name }),
    ...(slot.prompt === undefined ? {} : { prompt: slot.prompt }),
  };
}

/** The slots one resolution has, as read at that level, roots and `ChoiceSet`s apart. */
interface ResolvedSlots {
  readonly roots: readonly CharacterSlot[];
  readonly choices: readonly CharacterSlot[];
}

/** Whether a root slot is listed: always, unless it is optional, empty, and nothing on the character needs it. */
function isListed(slot: RootSlot, picks: ReadonlyMap<SlotKey, ChoiceValue>, options: readonly RollOption[]): boolean {
  const neededBy = OPTIONAL_ROOT_SLOTS.get(slot.key);
  return neededBy === undefined || picks.has(slot.key) || neededBy.some((option) => options.includes(option));
}

/** Why a `ChoiceSet` slot's pick on offer still reads invalid: a feat above its slot's level, or its prerequisites unmet. */
type PickCheck = (slot: AnsweredSlot) => MessageDescriptor | undefined;

/** How one resolution's slots are read: the level they are planned at (undefined at the character's), and the check on picks. */
interface ReadAt {
  readonly planned: Level | undefined;
  readonly check: PickCheck;
}

function resolvedSlots(resolution: GrantResolution, context: SlotContext, { planned, check }: ReadAt): ResolvedSlots {
  const { picks, lookup } = context;
  const listedRoots = resolution.rootSlots.filter((slot) => isListed(slot, picks, resolution.rollOptions));
  const roots = listedRoots.map((slot) =>
    rootStatus(
      slot,
      {
        key: slot.key,
        subject: { kind: SlotSubjectKind.Root, content: slot.kind },
        stored: picks.get(slot.key),
        planned,
      },
      lookup,
    ),
  );
  const answered = resolution.answered.map((slot) => {
    const read: SlotRead = { key: slot.key, subject: choiceSubject(slot, lookup), stored: slot.pick, planned };
    const problem = check(slot);
    return problem === undefined ? validSlot(read, choiceName(slot, lookup)) : invalidSlot(read, slot.pick, problem);
  });
  const open = resolution.open.map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: choiceSubject(slot, lookup),
      stored: picks.get(slot.key),
      planned,
    };
    return read.stored === undefined
      ? validSlot(read, undefined)
      : invalidSlot(read, read.stored, invalidReason(read.stored, lookup));
  });
  return { roots, choices: [...answered, ...open] };
}

/** Each boost slot of each set, read at the character's level. */
function boostStatuses(
  document: CharacterDocument,
  { boosts }: SlotContent,
  picks: ReadonlyMap<SlotKey, ChoiceValue>,
): CharacterSlot[] {
  const level = Level.parse(document.level);
  return boostSets(document, boosts).flatMap((set) =>
    set.slots.map((slot) =>
      boostStatus(set, slot, {
        key: slot.key,
        subject: { kind: SlotSubjectKind.Boost, source: slot.source, level: slot.level },
        stored: picks.get(slot.key),
        planned: slot.level > level ? slot.level : undefined,
      }),
    ),
  );
}

/**
 * Each voluntary flaw taken, filled or invalid: invalid when its pick isn't on offer (the ancestry flaws it already),
 * or an earlier flaw took the attribute. An empty flaw slot is optional, so it isn't listed.
 */
function flawStatuses(
  document: CharacterDocument,
  { boosts }: SlotContent,
  picks: ReadonlyMap<SlotKey, ChoiceValue>,
): CharacterSlot[] {
  const slots = flawSlots(document, boosts);
  return slots.flatMap((slot, index): CharacterSlot[] => {
    const stored = picks.get(slot.key);
    if (stored === undefined) {
      return [];
    }
    const read: SlotRead = { key: slot.key, subject: { kind: SlotSubjectKind.Flaw }, stored, planned: undefined };
    if (slot.pick === undefined) {
      return [invalidSlot(read, stored, message(SlotInvalidMessage.NotOffered))];
    }
    const taken = slots.slice(0, index).some((other) => other.pick === slot.pick);
    return [taken ? invalidSlot(read, stored, message(SlotInvalidMessage.FlawTaken)) : validSlot(read, undefined)];
  });
}

/** The reason a skill pick that names a loaded skill counts for nothing. */
const SKILL_PROBLEMS: Readonly<Record<SkillPickProblem, string>> = {
  [SkillPickProblem.Trained]: SlotInvalidMessage.SkillTrained,
  [SkillPickProblem.Capped]: SlotInvalidMessage.SkillRankCapped,
};

/**
 * Each skill slot up to 20th level, read in order (#464): a pick is invalid when it trains a skill already trained, or
 * raises one past the rank its level allows; one naming no loaded skill reads as any other pick does.
 */
function skillStatuses(document: CharacterDocument, content: SlotContent): CharacterSlot[] {
  const level = Level.parse(document.level);
  return skillSlots(document, skillReads(document, content)).map((slot) => {
    const read: SlotRead = {
      key: slot.key,
      subject: { kind: SlotSubjectKind.Skill, source: slot.kind, level: slot.level },
      stored: slot.stored,
      planned: slot.level > level ? slot.level : undefined,
    };
    if (slot.stored === undefined || slot.pick !== undefined) {
      return validSlot(read, slot.pick?.name);
    }
    const reason =
      slot.problem === undefined ? invalidReason(slot.stored, content.lookup) : message(SKILL_PROBLEMS[slot.problem]);
    return invalidSlot(read, slot.stored, reason);
  });
}

/** The reason for each way a feat pick on offer is still wrong. */
const FEAT_PROBLEMS: Readonly<Record<FeatPickProblem, string>> = {
  [FeatPickProblem.TooHigh]: SlotInvalidMessage.NotOffered,
  [FeatPickProblem.Prerequisites]: SlotInvalidMessage.PrerequisitesNotMet,
  [FeatPickProblem.DedicationLocked]: SlotInvalidMessage.DedicationLocked,
};

/**
 * The check on each answered feat slot (#466), read at the level the slot opens: a feat above that level isn't on
 * offer there, and one whose prerequisites aren't met there is flagged. Other `ChoiceSet` slots pass.
 */
function featCheck(document: CharacterDocument, content: SlotContent): PickCheck {
  const reads = prerequisiteReads(document, content);
  return (slot) => {
    const problem = featPickProblem(reads, { slot: slot.key, selection: slot.pick });
    return problem === undefined ? undefined : message(FEAT_PROBLEMS[problem]);
  };
}

/** The character's level and every level above it, lowest first. */
function levelsUpFrom(level: Level): Level[] {
  return Array.from({ length: CHARACTER_LEVEL_MAX - level + 1 }, (_unused, index) => Level.parse(level + index));
}

/**
 * Whether `later`, read at a higher level, replaces `earlier`: a pick not offered at the character's level but
 * offered above it is the plan, as `selectSlot` takes a pick any level up to 20 offers.
 */
function plansIt(earlier: CharacterSlot, later: CharacterSlot): boolean {
  const invalidNow = earlier.status === SlotStatus.Invalid && earlier.level === undefined;
  return invalidNow && later.status === SlotStatus.Planned && later.selection !== undefined;
}

/** Adds each slot not yet seen, so a slot keeps how it reads at the lowest level read, unless a higher level plans it. */
function addUnseen(seen: Map<SlotKey, CharacterSlot>, slots: readonly CharacterSlot[]): void {
  for (const slot of slots) {
    const earlier = seen.get(slot.key);
    if (earlier === undefined || plansIt(earlier, slot)) {
      seen.set(slot.key, slot);
    }
  }
}

/** The root and `ChoiceSet` slots, each as read at the lowest level from the character's up that has it. */
function grantStatuses(level: Level, context: SlotContext, check: PickCheck): ResolvedSlots {
  const roots = new Map<SlotKey, CharacterSlot>();
  const choices = new Map<SlotKey, CharacterSlot>();
  for (const at of levelsUpFrom(level)) {
    const read = resolvedSlots(resolveSlotsAt(at, context), context, { planned: at > level ? at : undefined, check });
    addUnseen(roots, read.roots);
    addUnseen(choices, read.choices);
  }
  return { roots: [...roots.values()], choices: [...choices.values()] };
}

/** The name of a pick that is an entry id of loaded content. */
function entryName(value: ChoiceValue, lookup: ContentLookup): ContentText | undefined {
  const id = ContentId.safeParse(value);
  return id.success ? lookup.entry(id.data)?.name : undefined;
}

function hiddenSlot(key: SlotKey, selection: ChoiceValue, context: SlotContext): CharacterSlot {
  const name = entryName(selection, context.lookup) ?? context.spells.spell(selection)?.name;
  return { status: SlotStatus.Hidden, key, selection, ...named(name) };
}

/** The picks kept for no slot in `listed`, an entry or spell picked named. */
function hiddenPicks(context: SlotContext, listed: readonly CharacterSlot[]): CharacterSlot[] {
  const keys = new Set(listed.map((slot) => slot.key));
  return [...context.picks]
    .filter(([key]) => !keys.has(key))
    .map(([key, selection]) => hiddenSlot(key, selection, context));
}

/**
 * Every slot the character has, with its status (#419): its own slots, then its boosts by level and the voluntary
 * flaws it took (#550), then its trained skills and skill increases (#464), then its language slots (#470), then the
 * `ChoiceSet` slots its entries grant, then the prepared spell slots at its level (#478), then picks kept for slots it
 * no longer has. A slot on the character at its level reads as open, filled or invalid there; one that opens only
 * above it reads at the lowest level it opens, as planned, or invalid at that level. A stored pick for a slot found at
 * neither is hidden. Nothing is dropped: every stored pick is in the list.
 */
export function characterSlots(document: CharacterDocument, content: SlotContent): readonly CharacterSlot[] {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  const context: SlotContext = { ...content, picks };
  const { roots, choices } = grantStatuses(Level.parse(document.level), context, featCheck(document, content));
  const boosts = boostStatuses(document, content, picks);
  const flaws = flawStatuses(document, content, picks);
  const skills = skillStatuses(document, content);
  const languages = languageStatuses(document, content);
  const listed = [
    ...roots,
    ...boosts,
    ...flaws,
    ...skills,
    ...languages,
    ...choices,
    ...preparedStatuses(document, content),
    ...signatureStatuses(document, content),
  ];
  return [...listed, ...hiddenPicks(context, listed)];
}
