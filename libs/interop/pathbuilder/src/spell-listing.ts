import type { SlotContent } from '@pioneer/character/domain';
import { ContentId, SlotRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import type { ContentLookup } from './content-lookup';
import { ImportKind, PathbuilderName } from './import-kind';
import type { ImportedCaster, ImportedSpellRank } from './read-spells';

export type SpellPicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** Why a spell that matched content went in no slot. */
export const SpellGapReason = {
  /** The character has no prepared or spontaneous spellcasting of that tradition for the caster: a class or archetype not carried over, or the feat of an innate caster it lacks. */
  NoEntry: 'no-entry',
  /** Every slot of its rank is taken, or the entry has none. */
  NoSlot: 'no-slot',
  /** Slots of its rank are open, but none offers it: another tradition, or an uncommon or rare spell the build has no access to. */
  NotOffered: 'not-offered',
  /** The character has the innate entry of the feat that grants it, but the entry does not grant the spell: another pick, or another rank (ADR-0067). */
  NotGranted: 'not-granted',
} as const;
export type SpellGapReason = (typeof SpellGapReason)[keyof typeof SpellGapReason];

/** A matched spell no slot took: the caster it was listed under, the rank it was listed at and why. */
export const SpellGap = z.object({
  caster: PathbuilderName,
  rank: z.union([z.literal(SlotRank.Cantrip), z.int().min(1)]),
  name: PathbuilderName,
  reason: z.enum(SpellGapReason),
});
export type SpellGap = z.infer<typeof SpellGap>;

/** The picks for the character's prepared and repertoire slots, and the matched spells no slot took. */
export interface SpellPlacement {
  readonly choices: SpellPicks;
  readonly gaps: readonly SpellGap[];
}

/** What placing needs beside the document: the slots' content and the spells' names. */
export interface SpellPlacementContent {
  readonly slots: SlotContent;
  readonly lookup: ContentLookup;
}

/** A spell the export lists, matched to content, at the rank it lists it. */
export interface Listed {
  readonly name: PathbuilderName;
  readonly rank: ImportedSpellRank['rank'];
  readonly id: ContentId;
}

/** The spells `caster` lists that matched content, in the order it lists them. */
export function listed(caster: ImportedCaster, lookup: ContentLookup): Listed[] {
  return caster.ranks.flatMap(({ rank, spells }) =>
    spells.flatMap((name): Listed[] => {
      const match = lookup.resolve(ImportKind.Spell, name);
      return match === undefined ? [] : [{ name, rank, id: ContentId.parse(match.id) }];
    }),
  );
}
