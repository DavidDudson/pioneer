import { CompanionKind, SlotKey } from '@pioneer/rules/sdk';
import { InstantCodec, Uuid, Version } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

const COMPANION_NAME_MAX_LENGTH = 80;

/** Row id of one companion; the audit log keys every row by an `id`. */
export const CompanionId = Uuid.brand<'CompanionId'>();

export type CompanionId = z.infer<typeof CompanionId>;

/** What a companion is called. */
export const CompanionName = z.string().trim().min(1).max(COMPANION_NAME_MAX_LENGTH).brand<'CompanionName'>();

export type CompanionName = z.infer<typeof CompanionName>;

/** Why a companion was archived (ADR-0079). A dead familiar is not archived: death is play state. */
export const CompanionArchiveReason = {
  Replaced: 'replaced',
  Released: 'released',
} as const;

export type CompanionArchiveReason = ValueOf<typeof CompanionArchiveReason>;

/**
 * What the companion looks like and is made of. Its shape settles with the familiar rules; until then it is an open
 * object that `schema_version` can tighten later (ADR-0079).
 */
export const CompanionForm = z.looseObject({});

export type CompanionForm = z.output<typeof CompanionForm>;

/** When and why a companion was archived. */
export const CompanionArchive = z.object({
  at: InstantCodec,
  reason: z.enum(CompanionArchiveReason),
});

export type CompanionArchive = z.output<typeof CompanionArchive>;

/**
 * A creature that follows a character: a familiar now, later an animal companion or an eidolon (ADR-0079). Its
 * statistics are derived from the master and never stored here. It is archived, never deleted (ADR-0062).
 */
export const Companion = z.object({
  id: CompanionId,
  kind: z.enum(CompanionKind),
  name: CompanionName,
  form: CompanionForm,
  /** The slot that granted it, so a replaced grant can find its companion. */
  grantedBy: SlotKey,
  createdAt: InstantCodec,
  archived: CompanionArchive.optional(),
});

export type Companion = z.output<typeof Companion>;

/** A character's companions: the live ones, and the archived ones the owner can restore, newest first. */
export const CharacterCompanions = z.object({
  companions: z.array(Companion).readonly(),
});

export type CharacterCompanions = z.output<typeof CharacterCompanions>;

/**
 * The companion an owner adds. A character holds one live companion of each kind, so adding a second is a 409. The
 * write bumps the character's version, so the owner sends the version they read.
 */
export const AddCompanionBody = z.object({
  kind: z.enum(CompanionKind),
  name: CompanionName,
  form: CompanionForm,
  grantedBy: SlotKey,
  expectedVersion: Version,
});

export type AddCompanionBody = z.output<typeof AddCompanionBody>;

/** Why the owner archives a companion, and the character version they read. */
export const ArchiveCompanionBody = z.object({
  reason: z.enum(CompanionArchiveReason),
  expectedVersion: Version,
});

export type ArchiveCompanionBody = z.output<typeof ArchiveCompanionBody>;

/** The character version the owner read before restoring a companion. */
export const RestoreCompanionBody = z.object({ expectedVersion: Version });

export type RestoreCompanionBody = z.output<typeof RestoreCompanionBody>;
