import { Level } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { characterSlots } from './character-slot-status';
import { preparedStatuses, signatureStatuses } from './prepared-slot-status';
import { resolveSlotsAt, slotContextOf } from './slot-reads';
import type { SlotContent } from './slot-reads';

/** A slot and the level it sits at; none for a slot the timeline leaves out. */
interface Placed {
  readonly slot: CharacterSlot;
  readonly level: Level | undefined;
}

/** One level of the timeline: the slots it opens, each as the sheet reads it, picked or not. */
export interface TimelineRow {
  readonly level: Level;
  readonly slots: readonly CharacterSlot[];
}

/** Spell slots are placed apart from the rest: their class progression is read at each level, not once. */
const SPELL_SUBJECTS: ReadonlySet<SlotSubjectKind> = new Set([SlotSubjectKind.Spell, SlotSubjectKind.Signature]);

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);

/** Every level from 1st to `CHARACTER_LEVEL_MAX`, lowest first. */
function allLevels(): Level[] {
  const count = CHARACTER_LEVEL_MAX - CHARACTER_LEVEL_MIN + 1;
  return Array.from({ length: count }, (_unused, index) => Level.parse(CHARACTER_LEVEL_MIN + index));
}

/**
 * The lowest level, up to the character's, each root and `ChoiceSet` slot is on the character at. A slot opening
 * above the character's level is planned and carries its own level.
 */
function openingLevels(document: CharacterDocument, content: SlotContent): ReadonlyMap<SlotKey, Level> {
  const context = slotContextOf(document, content);
  const opening = new Map<SlotKey, Level>();
  for (const at of allLevels().filter((level) => level <= document.level)) {
    const resolution = resolveSlotsAt(at, context);
    for (const slot of [...resolution.rootSlots, ...resolution.open, ...resolution.answered]) {
      if (!opening.has(slot.key)) {
        opening.set(slot.key, at);
      }
    }
  }
  return opening;
}

function isSpellSlot(slot: CharacterSlot): boolean {
  return 'subject' in slot && SPELL_SUBJECTS.has(slot.subject.kind);
}

/** The level a slot opens at, or undefined for a slot the timeline leaves out. */
function openedAt(slot: CharacterSlot, opening: ReadonlyMap<SlotKey, Level>): Level | undefined {
  if (slot.status === SlotStatus.Hidden) {
    return undefined;
  }
  if (isSpellSlot(slot)) {
    return undefined;
  }
  if (slot.status === SlotStatus.Planned) {
    return slot.level;
  }
  if (slot.status === SlotStatus.Invalid && slot.level !== undefined) {
    return slot.level;
  }
  const { subject } = slot;
  if (
    subject.kind === SlotSubjectKind.Boost ||
    subject.kind === SlotSubjectKind.Skill ||
    subject.kind === SlotSubjectKind.Language
  ) {
    return subject.level;
  }
  return opening.get(slot.key) ?? FIRST_LEVEL;
}

/** Every prepared, repertoire and signature slot the character has at `at`, as read there. */
function spellSlotsAt(document: CharacterDocument, content: SlotContent, at: Level): CharacterSlot[] {
  return [...preparedStatuses(document, content, at), ...signatureStatuses(document, content, at)];
}

/**
 * The spell slots with the level each opens at (#634), read from the class progression at every level: one the
 * character has at its level opens at the lowest level up to it that has it, and reads as the sheet does; one it
 * doesn''t opens at the lowest level above that has it, and reads there, planned.
 */
function spellPlacements(document: CharacterDocument, content: SlotContent): Placed[] {
  const held = new Map(
    spellSlotsAt(document, content, Level.parse(document.level)).map((slot) => [slot.key, slot] as const),
  );
  const placed = new Map<SlotKey, Placed>();
  for (const at of allLevels()) {
    const own = at <= document.level;
    for (const slot of spellSlotsAt(document, content, at)) {
      const kept = held.get(slot.key);
      const opens = own ? kept !== undefined : kept === undefined;
      if (opens && !placed.has(slot.key)) {
        placed.set(slot.key, { slot: kept ?? slot, level: at });
      }
    }
  }
  return [...placed.values()];
}

/** The level a spell slot first opens at, or undefined when the class never gives the character it. */
export function spellSlotOpensAt(document: CharacterDocument, content: SlotContent, slot: SlotKey): Level | undefined {
  return spellPlacements(document, content).find((each) => each.slot.key === slot)?.level;
}

/**
 * One row per level from 1st to 20th (#491): the slots the class and ancestry progression open there, as
 * `characterSlots` reads them, so an empty slot is open or planned, a pick is filled, and a pick that no longer holds
 * is invalid at its level. A slot sits at the level it first opens. A prepared, repertoire or signature spell slot
 * sits at the level its rank''s count first reaches it (#634), planned above the character''s level.
 */
export function levelTimeline(document: CharacterDocument, content: SlotContent): readonly TimelineRow[] {
  const opening = openingLevels(document, content);
  const placed: Placed[] = [
    ...characterSlots(document, content).map((slot) => ({ slot, level: openedAt(slot, opening) })),
    ...spellPlacements(document, content),
  ];
  return allLevels().map((level) => ({
    level,
    slots: placed.filter((each) => each.level === level).map((each) => each.slot),
  }));
}
