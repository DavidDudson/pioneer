import { SlotKey } from '@pioneer/rules/sdk';
import type { ChoiceValue } from '@pioneer/rules/sdk';
import type { Temporal } from '@pioneer/shared/kernel';

import type { Character } from './character';
import type { CharacterDocument } from './character-document';
import type { CharacterLevel } from './character-fields';
import { CharacterPatchField } from './character-patch';
import { SlotStatus } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { characterSlots } from './character-slot-status';
import { withoutPick } from './feat-slots';
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

/** The picks a slot read as invalid after later ones, which it is not offered again. */
type Rejected = Map<SlotKey, ChoiceValue[]>;

/** What each pick is read from and drawn with, and what a slot is not offered. */
interface Filling {
  readonly content: SlotContent;
  readonly source: PickSource;
  readonly now: Temporal.Instant;
  readonly rejected: Rejected;
}

/** Most rounds of taking out picks that read invalid; real content settles in a few. */
const REPAIRS_MAX = 8;

/**
 * One of an open slot's candidates the builder's own check accepts, tried in random order; undefined when none is. A
 * candidate is never one whose prerequisites are unparsed, so those are never treated as met.
 */
function pickFor(character: Character, { content, source, rejected }: Filling, slot: OpenSlot): SlotPick | undefined {
  const refused = rejected.get(slot.key) ?? [];
  const candidates = slotCandidates(character.document, content, slot).filter((value) => !refused.includes(value));
  const selection = shuffle(source, candidates).find(
    (candidate) => slotRefusal(character.document, content, { slot: slot.key, selection: candidate }) === undefined,
  );
  return selection === undefined ? undefined : { slot: slot.key, selection };
}

/** A slot with nothing picked. */
type OpenSlot = Extract<CharacterSlot, { status: typeof SlotStatus.Open }>;

function isOpen(slot: CharacterSlot): slot is OpenSlot {
  return slot.status === SlotStatus.Open;
}

/** The slots `character` has open, in the order they are read. */
function openSlots(character: Character, content: SlotContent): readonly OpenSlot[] {
  return characterSlots(character.document, content).filter((slot) => isOpen(slot));
}

/**
 * `character` with every slot it has open picked once. Slots are read once a pass (reading resolves the grants at every
 * level) and each is picked for in turn over the picks before it; a pick that opens a slot, as an ancestry's heritage
 * does, is found by the next pass. Passes go on while one picks, so a slot that took nothing early is tried again.
 */
function filled(start: Character, filling: Filling): Character {
  const { content, now } = filling;
  const picked = new Set<SlotKey>();
  let character = start;
  for (let progress = true; progress;) {
    progress = false;
    for (const slot of openSlots(character, content).filter((open) => !picked.has(open.key))) {
      const pick = pickFor(character, filling, slot);
      if (pick !== undefined) {
        picked.add(slot.key);
        progress = true;
        character = character.apply({ field: CharacterPatchField.SelectSlot, ...pick }, now);
      }
    }
  }
  return character;
}

/** The picks `character` holds that their slots read as invalid: a later pick can undo what an earlier one allowed. */
function invalidPicks(character: Character, content: SlotContent): readonly SlotPick[] {
  return characterSlots(character.document, content).flatMap((slot) =>
    slot.status === SlotStatus.Invalid ? [{ slot: slot.key, selection: slot.selection }] : [],
  );
}

/** Whether `document` has `slot`, open or answered, over the picks it holds. */
function hasSlot(document: CharacterDocument, content: SlotContent, slot: SlotKey): boolean {
  return characterSlots(document, content).some((each) => each.key === slot && each.status !== SlotStatus.Hidden);
}

/**
 * The picks that opened each slot nothing valid could be picked for, because its picks read invalid again (the grants it
 * gives can undo the offer, whichever it is). The slot's cause is the latest pick without which the character has no such
 * slot: a feat, or a background that grants one. It is taken out in the slot's place.
 */
function culpritPicks(character: Character, { content, rejected }: Filling): readonly SlotPick[] {
  const stuck = characterSlots(character.document, content).filter(
    (slot) => (isOpen(slot) || slot.status === SlotStatus.Invalid) && rejected.has(slot.key),
  );
  const picks = Object.entries(character.document.build.choices).toReversed();
  return stuck.flatMap((slot): SlotPick[] => {
    const cause = picks.find(
      ([key]) => !hasSlot(withoutPick(character.document, SlotKey.parse(key)), content, slot.key),
    );
    return cause === undefined ? [] : [{ slot: SlotKey.parse(cause[0]), selection: cause[1] }];
  });
}

/** `character` without `picks`, each kept out of its slot from then on. */
function withoutPicks(character: Character, picks: readonly SlotPick[], filling: Filling): Character {
  const { rejected, now } = filling;
  let cleared = character;
  for (const { slot, selection } of picks) {
    rejected.set(slot, [...(rejected.get(slot) ?? []), selection]);
    cleared = cleared.apply({ field: CharacterPatchField.ClearSlot, slot }, now);
  }
  return cleared;
}

/**
 * `start` at `level` with every slot it has open picked at random, from what each offers (the builder's own check, so a
 * pick is never one `selectSlot` would refuse). Picks go in through `selectSlot`, the slots read again once a pass: a
 * pick can open more (an ancestry's heritage and boosts, a feat's own choices). A pick a later one makes invalid, or a
 * feat whose own choice can't be made validly, is taken out and its slot filled again without it. A slot with nothing
 * to pick is left in `unfilled`. The same seed and character give the same one.
 */
export function generateCharacter({ start, seed, level, content, now }: GenerateInput): Generated {
  const filling: Filling = { content, source: seededPicks(seed), now, rejected: new Map() };
  let character = filled(start.apply({ field: CharacterPatchField.Level, value: level }, now), filling);
  for (let round = 0; round < REPAIRS_MAX; round += 1) {
    const undone = [...invalidPicks(character, content), ...culpritPicks(character, filling)];
    if (undone.length === 0) {
      break;
    }
    character = filled(withoutPicks(character, undone, filling), filling);
  }
  character = withoutPicks(character, invalidPicks(character, content), filling);
  return { character, unfilled: openSlots(character, content).map((slot) => slot.key) };
}
