import type { AnsweredSlot, ChoiceSlot, ContentLookup, GrantResolution, RootSlot } from '@pioneer/rules/grants';
import { ContentId, Level, SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentText } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { boostSets, flawSlots } from './attribute-boosts';
import type { BoostSet, BoostSlot } from './attribute-boosts';
import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX } from './character-fields';
import { SlotInvalidMessage, SlotStatus, SlotSubjectKind } from './character-slot';
import type { CharacterSlot, SlotSubject } from './character-slot';
import { resolveSlotsAt } from './slot-offer';
import type { SlotContent, SlotContext } from './slot-offer';

/** How a slot reads at one level: the pick it holds, and the level it is planned at (undefined at the character's). */
interface SlotRead {
  readonly key: SlotKey;
  readonly subject: SlotSubject;
  readonly stored: ChoiceValue | undefined;
  readonly planned: Level | undefined;
}

/** A selection's name, if it has one: none when undefined (`exactOptionalPropertyTypes`). */
interface Named {
  readonly selectionName?: ContentText;
}

function named(selectionName: ContentText | undefined): Named {
  return selectionName === undefined ? {} : { selectionName };
}

/** A slot whose pick, if any, it offers: open or filled at the character's level, else planned. */
function validSlot({ key, subject, stored, planned }: SlotRead, selectionName: ContentText | undefined): CharacterSlot {
  if (planned !== undefined) {
    const selection = stored === undefined ? {} : { selection: stored };
    return { status: SlotStatus.Planned, key, subject, level: planned, ...selection, ...named(selectionName) };
  }
  if (stored === undefined) {
    return { status: SlotStatus.Open, key, subject };
  }
  return { status: SlotStatus.Filled, key, subject, selection: stored, ...named(selectionName) };
}

function invalidSlot(
  { key, subject, planned }: SlotRead,
  selection: ChoiceValue,
  reason: MessageDescriptor,
): CharacterSlot {
  const level = planned === undefined ? {} : { level: planned };
  return { status: SlotStatus.Invalid, key, subject, selection, reason, ...level };
}

/** An entry id whose content isn't loaded; anything else the slot doesn't offer. */
function invalidReason(value: ChoiceValue, lookup: ContentLookup): MessageDescriptor {
  const id = ContentId.safeParse(value);
  const unloaded = id.success && lookup.entry(id.data) === undefined;
  return message(unloaded ? SlotInvalidMessage.ContentNotLoaded : SlotInvalidMessage.NotOffered);
}

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

function resolvedSlots(resolution: GrantResolution, context: SlotContext, planned: Level | undefined): ResolvedSlots {
  const { picks, lookup } = context;
  const roots = resolution.rootSlots.map((slot) =>
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
  const answered = resolution.answered.map((slot) =>
    validSlot(
      { key: slot.key, subject: choiceSubject(slot, lookup), stored: slot.pick, planned },
      choiceName(slot, lookup),
    ),
  );
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
function grantStatuses(level: Level, context: SlotContext): ResolvedSlots {
  const roots = new Map<SlotKey, CharacterSlot>();
  const choices = new Map<SlotKey, CharacterSlot>();
  for (const at of levelsUpFrom(level)) {
    const read = resolvedSlots(resolveSlotsAt(at, context), context, at > level ? at : undefined);
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

function hiddenSlot(key: SlotKey, selection: ChoiceValue, lookup: ContentLookup): CharacterSlot {
  return { status: SlotStatus.Hidden, key, selection, ...named(entryName(selection, lookup)) };
}

/** The picks kept for no slot in `listed`, an entry picked named. */
function hiddenPicks(context: SlotContext, listed: readonly CharacterSlot[]): CharacterSlot[] {
  const keys = new Set(listed.map((slot) => slot.key));
  return [...context.picks]
    .filter(([key]) => !keys.has(key))
    .map(([key, selection]) => hiddenSlot(key, selection, context.lookup));
}

/**
 * Every slot the character has, with its status (#419): its own slots, then its boosts by level and the voluntary
 * flaws it took (#550), then the `ChoiceSet` slots its entries grant, then picks kept for slots it no longer has. A
 * slot on the character at its level reads as open, filled or invalid there; one that opens only above it reads at
 * the lowest level it opens, as planned, or invalid at that level. A stored pick for a slot found at neither is
 * hidden. Nothing is dropped: every stored pick is in the list.
 */
export function characterSlots(document: CharacterDocument, content: SlotContent): readonly CharacterSlot[] {
  const picks = new Map(Object.entries(document.build.choices).map(([key, value]) => [SlotKey.parse(key), value]));
  const context: SlotContext = { ...content, picks };
  const { roots, choices } = grantStatuses(Level.parse(document.level), context);
  const boosts = boostStatuses(document, content, picks);
  const listed = [...roots, ...boosts, ...flawStatuses(document, content, picks), ...choices];
  return [...listed, ...hiddenPicks(context, listed)];
}
