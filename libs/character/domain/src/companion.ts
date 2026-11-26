import { CompanionKind, ContentId, SlotKey } from '@pioneer/rules/sdk';
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
 * What a familiar looks like and is made of. Its shape settles with the familiar rules; until then it is an open object
 * that `schema_version` can tighten later (ADR-0079).
 */
export const FamiliarForm = z.looseObject({});

export type FamiliarForm = z.output<typeof FamiliarForm>;

/**
 * What an animal companion is made of: its species, the id of a companion-kind content entry. The engine resolves it,
 * and reports one it cannot find as a problem, so a pack that goes away does not break the load (ADR-0080).
 */
export const AnimalCompanionForm = z.object({ species: ContentId });

export type AnimalCompanionForm = z.output<typeof AnimalCompanionForm>;

/** A companion's form, by kind. */
export type CompanionForm = FamiliarForm | AnimalCompanionForm;

/** When and why a companion was archived. */
export const CompanionArchive = z.object({
  at: InstantCodec,
  reason: z.enum(CompanionArchiveReason),
});

export type CompanionArchive = z.output<typeof CompanionArchive>;

const CompanionBase = z.object({
  id: CompanionId,
  name: CompanionName,
  /** The slot that granted it, so a replaced grant can find its companion. */
  grantedBy: SlotKey,
  createdAt: InstantCodec,
  archived: CompanionArchive.optional(),
});

/**
 * A creature that follows a character: a familiar or an animal companion now, later an eidolon (ADR-0079, ADR-0080).
 * A union on `kind`, so each kind has its own `form`. Its statistics are derived from the master and never stored
 * here. It is archived, never deleted (ADR-0062).
 */
export const Companion = z.discriminatedUnion('kind', [
  CompanionBase.extend({ kind: z.literal(CompanionKind.Familiar), form: FamiliarForm }),
  CompanionBase.extend({ kind: z.literal(CompanionKind.AnimalCompanion), form: AnimalCompanionForm }),
]);

export type Companion = z.output<typeof Companion>;

/** How many live companions of one kind a character holds at most. */
export const LiveCompanionCount = z.int().positive().brand<'LiveCompanionCount'>();

export type LiveCompanionCount = z.infer<typeof LiveCompanionCount>;

const ONE_LIVE = LiveCompanionCount.parse(1);
const FOUR_LIVE = LiveCompanionCount.parse(4);

/**
 * The most live companions a character holds of each kind. A familiar is one. An animal companion is one unless the
 * Beastmaster feats grant more, up to four; the database cannot see feats, so the engine checks the feats and the
 * write only holds the hard cap (ADR-0080).
 */
export const COMPANION_LIVE_LIMIT: Readonly<Record<CompanionKind, LiveCompanionCount>> = {
  [CompanionKind.Familiar]: ONE_LIVE,
  [CompanionKind.AnimalCompanion]: FOUR_LIVE,
};

/** A character's companions: the live ones, and the archived ones the owner can restore, newest first. */
export const CharacterCompanions = z.object({
  companions: z.array(Companion).readonly(),
});

export type CharacterCompanions = z.output<typeof CharacterCompanions>;

const AddCompanionBase = z.object({
  name: CompanionName,
  grantedBy: SlotKey,
  expectedVersion: Version,
});

/**
 * The companion an owner adds. A character holds at most `COMPANION_LIVE_LIMIT` live companions of a kind, so adding
 * one past it is a 409. The write bumps the character's version, so the owner sends the version they read.
 */
export const AddCompanionBody = z.discriminatedUnion('kind', [
  AddCompanionBase.extend({ kind: z.literal(CompanionKind.Familiar), form: FamiliarForm }),
  AddCompanionBase.extend({ kind: z.literal(CompanionKind.AnimalCompanion), form: AnimalCompanionForm }),
]);

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
