import type { SlotKey } from '@pioneer/rules/sdk';
import type { Temporal } from '@pioneer/shared/kernel';

import type { Character } from './character';
import type { CharacterLevel } from './character-fields';
import { CharacterPatchField } from './character-patch';
import { SlotStatus } from './character-slot';
import { characterSlots } from './character-slot-status';
import { seededPicks } from './pick-source';
import type { PickSource, Seed } from './pick-source';
import { shuffle } from './picks';
import { slotCandidates } from './slot-candidates';
import { slotRefusal } from './slot-offer';
import type { SlotContent, SlotPick } from './slot-offer';

/** What `generateCharacter` is asked for: the character to start from, how far to take it, and what to read. */
export interface GenerateInput {
  /** The character to fill: its own picks stay, so a started build (a chosen ancestry, say) is kept. */
  readonly start: Character;
  readonly seed: Seed;
  readonly level: CharacterLevel;
  readonly content: SlotContent;
  readonly now: Temporal.Instant;
}

/** A generated character, and the slots left open because nothing the slot offers could be picked. */
export interface Generated {
  readonly character: Character;
  readonly unfilled: readonly SlotKey[];
}

/** What each pick is read from and drawn with. */
interface Filling {
  readonly content: SlotContent;
  readonly source: PickSource;
}

/**
 * One of `slot`'s candidates the builder's own check accepts, tried in random order; undefined when none is. A
 * candidate is never one whose prerequisites are unparsed, so those are never treated as met.
 */
function pickFor(character: Character, { content, source }: Filling, slot: SlotKey): SlotPick | undefined {
  const open = characterSlots(character.document, content).find((each) => each.key === slot);
  if (open === undefined) {
    return undefined;
  }
  const selection = shuffle(source, slotCandidates(character.document, content, open)).find(
    (candidate) => slotRefusal(character.document, content, { slot, selection: candidate }) === undefined,
  );
  return selection === undefined ? undefined : { slot, selection };
}

/** The keys of the slots `character` has open, in the order they are read. */
function openSlots(character: Character, content: SlotContent): readonly SlotKey[] {
  return characterSlots(character.document, content).flatMap((slot) =>
    slot.status === SlotStatus.Open ? [slot.key] : [],
  );
}

/**
 * `start` at `level` with every slot it has open picked at random, from what each offers (the builder's own check, so a
 * pick is never one `selectSlot` would refuse). Picks go in through `selectSlot`, one at a time, with the slots read
 * again after each: a pick can open more (an ancestry's heritage and boosts, a feat's own choices). Each slot is tried
 * once; one with nothing to pick is left in `unfilled`. The same seed and character give the same one.
 */
export function generateCharacter({ start, seed, level, content, now }: GenerateInput): Generated {
  const filling: Filling = { content, source: seededPicks(seed) };
  const tried = new Set<SlotKey>();
  let character = start.apply({ field: CharacterPatchField.Level, value: level }, now);
  for (let next = openSlots(character, content).at(0); next !== undefined;) {
    tried.add(next);
    const pick = pickFor(character, filling, next);
    character =
      pick === undefined ? character : character.apply({ field: CharacterPatchField.SelectSlot, ...pick }, now);
    next = openSlots(character, content).find((key) => !tried.has(key));
  }
  return { character, unfilled: openSlots(character, content) };
}
