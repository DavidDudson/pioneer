import { SlotKey, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentId, Slug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import type { CharacterDocument } from './character-document';
import { preparedSlots } from './prepared-spells';
import type { PreparedReads, PreparedSlot } from './prepared-spells';
import type { SlotPick } from './slot-offer';
import type { SpellOption } from './spell-content';
import { characterSpellcasting } from './spellcasting-build';

/** Every signature slot's key starts so: `signature:bard:3` (#479). */
const SIGNATURE_PREFIX = 'signature:';

/** Why a stored signature pick naming a loaded spell isn't on offer. */
export const SignaturePickProblem = {
  /** Not in the entry's repertoire at the slot's rank: swapped out, or learned at another rank. */
  NotInRepertoire: 'notInRepertoire',
} as const;
export type SignaturePickProblem = ValueOf<typeof SignaturePickProblem>;

/**
 * One signature slot on the character at its level (ADR-0046): a spontaneous entry with signature spells has one per
 * rank of its slots, 1st and up, offering the spells its repertoire knows at that rank. Its pick is cast at every rank
 * from the spell's own up to the entry's highest (`castRanks`).
 */
export interface SignatureSlot {
  readonly key: SlotKey;
  readonly entry: Slug;
  readonly rank: SpellRank;
  /** The repertoire's spells of this rank, by name, each once. */
  readonly options: readonly SpellOption[];
  readonly stored: ChoiceValue | undefined;
  /** Undefined while the slot is empty, or holds something it doesn't offer. */
  readonly pick: SpellOption | undefined;
  readonly problem: SignaturePickProblem | undefined;
  /** The ranks the pick is cast at; empty without one. */
  readonly castRanks: readonly SpellRank[];
}

/** A repertoire spell as `castRanks` reads it. */
export interface KnownSpell {
  /** The spell's own rank. */
  readonly own: SpellRank;
  /** The rank its repertoire slot learned it at, its own or higher. */
  readonly learned: SpellRank;
  readonly signature: boolean;
  /** The entry's highest rank of slots. */
  readonly highest: SpellRank;
}

/**
 * The ranks a repertoire spell is cast at (Player Core, Signature Spells): only the rank it was learned at, unless it is
 * a signature spell, which is cast heightened to any rank up to the entry's highest and at any lower one down to its
 * own, without learning each apart.
 */
export function castRanks({ own, learned, signature, highest }: KnownSpell): readonly SpellRank[] {
  if (!signature) {
    return [learned];
  }
  const top = Math.max(learned, highest);
  return Array.from({ length: top - own + 1 }, (_unused, index) => SpellRank.parse(own + index));
}

/** Each spell once, in the order first met. */
function distinct(spells: readonly SpellOption[]): SpellOption[] {
  const seen = new Set<ContentId>();
  return spells.filter((spell) => {
    const fresh = !seen.has(spell.id);
    seen.add(spell.id);
    return fresh;
  });
}

/** The spells a repertoire knows at `rank`: the picks its own slots of that rank hold and offer. */
function knownAt(repertoire: readonly PreparedSlot[], rank: SpellRank): SpellOption[] {
  return distinct(
    repertoire.flatMap((slot) =>
      slot.rank === rank && slot.pool === undefined && slot.pick !== undefined ? [slot.pick] : [],
    ),
  );
}

/**
 * Every signature slot on the character at its level (#479): for each spontaneous entry a `SignatureSpells` element
 * gives signature spells, one per rank of its own slots, 1st and up, keyed `signature:<entry>:<rank>`. Each offers the
 * spells the entry's repertoire knows at that rank. Like a repertoire's, they open at the character's level only.
 */
export function signatureSlots(document: CharacterDocument, reads: PreparedReads): SignatureSlot[] {
  const { spells, resolution } = reads;
  const repertoires = preparedSlots(document, reads);
  return characterSpellcasting(resolution)
    .filter((entry) => entry.preparation === SpellPreparation.Spontaneous && entry.signatures)
    .flatMap(({ slug, slots }) => {
      const highest = slots.ranks.at(-1)?.rank;
      const repertoire = repertoires.filter((slot) => slot.entry === slug);
      return slots.ranks.map(({ rank }): SignatureSlot => {
        const key = SlotKey.parse(`${SIGNATURE_PREFIX}${slug}:${rank}`);
        const options = knownAt(repertoire, rank);
        const stored = document.build.choices[key];
        const named = stored === undefined ? undefined : spells.spell(stored);
        const pick = options.find((spell) => spell.id === named?.id);
        const problem = named === undefined || pick !== undefined ? undefined : SignaturePickProblem.NotInRepertoire;
        const ranks =
          pick === undefined
            ? []
            : castRanks({ own: pick.rank, learned: rank, signature: true, highest: highest ?? rank });
        return { key, entry: slug, rank, options, stored, pick, problem, castRanks: ranks };
      });
    });
}

/** Why a signature slot refuses a spell: the character hasn't the slot at its level, or its repertoire lacks the spell. */
export const SignatureRefusal = { NotOpen: 'notOpen', NotOffered: 'notOffered' } as const;
export type SignatureRefusal = ValueOf<typeof SignatureRefusal>;

/** Why a pick's spell can't be a signature spell in its slot, or undefined when it can. */
export function signatureRefusal(
  document: CharacterDocument,
  reads: PreparedReads,
  { slot: key, selection }: SlotPick,
): SignatureRefusal | undefined {
  const slot = signatureSlots(document, reads).find((each) => each.key === key);
  if (slot === undefined) {
    return SignatureRefusal.NotOpen;
  }
  return slot.options.some((spell) => spell.id === selection) ? undefined : SignatureRefusal.NotOffered;
}

/** Whether `slot` is a signature slot's key, whether or not the character has it. */
export function isSignatureKey(slot: SlotKey): boolean {
  return slot.startsWith(SIGNATURE_PREFIX);
}
