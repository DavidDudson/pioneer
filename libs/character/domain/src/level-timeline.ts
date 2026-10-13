import { Level } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import type { CharacterDocument } from './character-document';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { SlotStatus, SlotSubjectKind } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { characterSlots } from './character-slot-status';
import { picksOf, resolveSlotsAt } from './slot-reads';
import type { SlotContent, SlotContext } from './slot-reads';

/** One level of the timeline: the slots it opens, each as the sheet reads it, picked or not. */
export interface TimelineRow {
  readonly level: Level;
  readonly slots: readonly CharacterSlot[];
}

/** Slots the Spellcasting section shows under their entry; they open at the character's level only. */
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
  const context: SlotContext = { ...content, picks: picksOf(document) };
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

/** The level a slot opens at, or undefined for a slot the timeline leaves out. */
function openedAt(slot: CharacterSlot, opening: ReadonlyMap<SlotKey, Level>): Level | undefined {
  if (slot.status === SlotStatus.Hidden) {
    return undefined;
  }
  if (SPELL_SUBJECTS.has(slot.subject.kind)) {
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

/**
 * One row per level from 1st to 20th (#491): the slots the class and ancestry progression open there, as
 * `characterSlots` reads them, so an empty slot is open or planned, a pick is filled, and a pick that no longer holds
 * is invalid at its level. A slot sits at the level it first opens. Prepared and signature spell slots open at the
 * character's level only and are left to the Spellcasting section.
 */
export function levelTimeline(document: CharacterDocument, content: SlotContent): readonly TimelineRow[] {
  const opening = openingLevels(document, content);
  const placed = characterSlots(document, content).map((slot) => ({ slot, level: openedAt(slot, opening) }));
  return allLevels().map((level) => ({
    level,
    slots: placed.filter((each) => each.level === level).map((each) => each.slot),
  }));
}
