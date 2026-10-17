import { Pg, Uuid } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CharacterId } from './campaign-fields';
import { ReviewedName, ReviewedRuneId } from './campaign-item-approvals';

/** A campaign's key item. Branded like the character context's, so ids pass between the contexts unchanged. */
export const KeyItemId = Uuid.brand<'KeyItemId'>();
export type KeyItemId = z.infer<typeof KeyItemId>;

const KEY_ITEM_NAME_MAX_LENGTH = 80;

/** What the GM calls the key item: "Caliburn". It is also the name the holder's inventory line shows. */
export const KeyItemName = z.string().trim().min(1).max(KEY_ITEM_NAME_MAX_LENGTH).brand<'KeyItemName'>();
export type KeyItemName = z.infer<typeof KeyItemName>;

const KEY_ITEM_NOTES_MAX_LENGTH = 2000;

/** What the GM wrote about the item: its story, what it does at the table. */
export const KeyItemNotes = z.string().trim().max(KEY_ITEM_NOTES_MAX_LENGTH).brand<'KeyItemNotes'>();
export type KeyItemNotes = z.infer<typeof KeyItemNotes>;

/** The base content item a key item is, by id, with the name the campaign shows for it. */
export const KeyItemBase = z.strictObject({ item: ReviewedRuneId, name: ReviewedName });
export type KeyItemBase = z.output<typeof KeyItemBase>;

/** The grade of a potency, striking or resilient rune, as the rules print it: +1 to +4. */
const RUNE_GRADE_MAX = 4;
const KeyRuneGrade = Pg.smallint().min(1).max(RUNE_GRADE_MAX).brand<'RuneGrade'>();

/** The grade of a reinforcing rune, minor to supreme. */
const REINFORCING_GRADE_MAX = 6;
const KeyReinforcingGrade = Pg.smallint().min(1).max(REINFORCING_GRADE_MAX).brand<'ReinforcingGrade'>();

/** The most property runes a stored line holds; the table's own cap does not bind a key item. */
const KEY_ITEM_PROPERTY_RUNES_MAX = 20;

/** A property rune on a key item, by content id, with the name the campaign shows for it. */
export const KeyPropertyRune = z.strictObject({ rune: ReviewedRuneId, name: ReviewedName });
export type KeyPropertyRune = z.output<typeof KeyPropertyRune>;

/**
 * The runes a key item carries, exactly as the GM states them, even past the table's caps (Caliburn with six property
 * runes). They land on the holder's inventory line the same way.
 */
export const KeyItemRunes = z.strictObject({
  potency: KeyRuneGrade.optional(),
  striking: KeyRuneGrade.optional(),
  resilient: KeyRuneGrade.optional(),
  reinforcing: KeyReinforcingGrade.optional(),
  property: z.array(KeyPropertyRune).max(KEY_ITEM_PROPERTY_RUNES_MAX).readonly().default([]),
});
export type KeyItemRunes = z.output<typeof KeyItemRunes>;

/** A key item the GM created: what it is, its notes, and who holds it. Archived, never deleted (ADR-0062). */
export interface CampaignKeyItem {
  readonly id: KeyItemId;
  readonly name: KeyItemName;
  readonly base: KeyItemBase;
  readonly runes: KeyItemRunes;
  readonly notes: KeyItemNotes;
  /** The character holding it; none when the party stash does. */
  readonly holder: CharacterId | undefined;
  /** When the GM created it; the list is oldest first. */
  readonly createdAt: Temporal.Instant;
}

/** What the GM states to create a key item. */
export const CreateKeyItemBody = z.object({
  name: KeyItemName,
  base: KeyItemBase,
  runes: KeyItemRunes.default(KeyItemRunes.parse({})),
  notes: KeyItemNotes.default(KeyItemNotes.parse('')),
});
export type CreateKeyItemBody = z.output<typeof CreateKeyItemBody>;

/** The character the GM gives a key item to, or moves it to. */
export const GiveKeyItemBody = z.object({ characterId: CharacterId });
export type GiveKeyItemBody = z.output<typeof GiveKeyItemBody>;

/** One key item as the Party Inventory shows it. */
export const KeyItemView = z.object({
  id: KeyItemId,
  name: KeyItemName,
  base: KeyItemBase,
  runes: KeyItemRunes,
  notes: KeyItemNotes,
  holder: CharacterId.optional(),
  /** The holder's name as the character context shows it. */
  holderName: ReviewedName.optional(),
});
export type KeyItemView = z.output<typeof KeyItemView>;

/** JSON shape of a campaign's key items. Every member sees all of them; only the GM may change them. */
export const CampaignKeyItems = z.object({
  /** Whether the viewer may create, give, take back and archive: the GM. */
  manageable: z.boolean(),
  keyItems: z.array(KeyItemView).readonly(),
});
export type CampaignKeyItems = z.output<typeof CampaignKeyItems>;
