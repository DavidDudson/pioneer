import { ChoiceValue, ContentId, ContentKindSchema, ContentText, Level, SlotKey } from '@pioneer/rules/sdk';
import { MessageDescriptorSchema } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { BoostSource } from './attribute-boosts';
import { SkillSlotKind } from './skill-training';

/**
 * Where a slot stands for the character at its level (character-model.md, "Choice slots"). Worked out on every read
 * from the picks and the content, never stored.
 */
export const SlotStatus = {
  /** On the character, with nothing picked. */
  Open: 'open',
  /** On the character, with a pick it offers. */
  Filled: 'filled',
  /** Opens above the character's level: the plan. */
  Planned: 'planned',
  /** A pick kept for a slot the character no longer has, at its level or above; it comes back with the slot. */
  Hidden: 'hidden',
  /** A pick the slot doesn't offer, or whose content isn't loaded. */
  Invalid: 'invalid',
} as const;
export type SlotStatus = ValueOf<typeof SlotStatus>;

/**
 * What kind of slot it is: one the character has itself, an attribute boost or flaw, a trained skill or skill increase,
 * or a `ChoiceSet` on an entry.
 */
export const SlotSubjectKind = {
  Root: 'root',
  Boost: 'boost',
  Flaw: 'flaw',
  Skill: 'skill',
  Choice: 'choice',
} as const;
export type SlotSubjectKind = ValueOf<typeof SlotSubjectKind>;

/** What a slot is for, so the sheet can name it. */
export const SlotSubject = z.discriminatedUnion('kind', [
  /** The ancestry, background or class slot: its key names it. */
  z.strictObject({ kind: z.literal(SlotSubjectKind.Root), content: ContentKindSchema }),
  z.strictObject({ kind: z.literal(SlotSubjectKind.Boost), source: z.enum(BoostSource), level: Level }),
  /** A voluntary ancestry flaw: its key numbers it. */
  z.strictObject({ kind: z.literal(SlotSubjectKind.Flaw) }),
  /** A trained skill or a skill increase, at the level it comes at. */
  z.strictObject({ kind: z.literal(SlotSubjectKind.Skill), source: z.enum(SkillSlotKind), level: Level }),
  /** A `ChoiceSet` on `entry`, asking `prompt`. */
  z.strictObject({
    kind: z.literal(SlotSubjectKind.Choice),
    entry: ContentId,
    entryName: ContentText.optional(),
    prompt: ContentText.optional(),
  }),
]);
export type SlotSubject = z.output<typeof SlotSubject>;

/**
 * One slot as the sheet shows it. `selectionName` names an entry or listed option picked; an attribute boost's or
 * flaw's pick is its attribute. `level` is where a planned slot opens, or where a planned pick that stopped being valid
 * is flagged.
 */
export const CharacterSlot = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal(SlotStatus.Open), key: SlotKey, subject: SlotSubject }),
  z.strictObject({
    status: z.literal(SlotStatus.Filled),
    key: SlotKey,
    subject: SlotSubject,
    selection: ChoiceValue,
    selectionName: ContentText.optional(),
  }),
  z.strictObject({
    status: z.literal(SlotStatus.Planned),
    key: SlotKey,
    subject: SlotSubject,
    level: Level,
    selection: ChoiceValue.optional(),
    selectionName: ContentText.optional(),
  }),
  z.strictObject({
    status: z.literal(SlotStatus.Invalid),
    key: SlotKey,
    subject: SlotSubject,
    level: Level.optional(),
    selection: ChoiceValue,
    reason: MessageDescriptorSchema,
  }),
  z.strictObject({
    status: z.literal(SlotStatus.Hidden),
    key: SlotKey,
    selection: ChoiceValue,
    selectionName: ContentText.optional(),
  }),
]);
export type CharacterSlot = z.output<typeof CharacterSlot>;

/** Why a stored pick is invalid; one message key per reason. */
export const SlotInvalidMessage = {
  NotOffered: 'rules.choices.invalid.notOffered',
  ContentNotLoaded: 'rules.choices.invalid.contentNotLoaded',
  BoostTaken: 'rules.choices.invalid.boostTaken',
  FlawTaken: 'rules.choices.invalid.flawTaken',
  SkillTrained: 'rules.choices.invalid.skillTrained',
  SkillRankCapped: 'rules.choices.invalid.skillRankCapped',
} as const;
