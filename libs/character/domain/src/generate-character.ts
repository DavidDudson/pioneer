import type { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import type { Temporal } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { weighCandidates } from './candidate-weights';
import type { Character } from './character';
import { CharacterLevel } from './character-fields';
import { CharacterPatchField } from './character-patch';
import { SlotStatus } from './character-slot';
import type { CharacterSlot } from './character-slot';
import { characterSlots } from './character-slot-status';
import { generateGear } from './generate-gear';
import type { GenerationTheme } from './generation-theme';
import type { ItemContent } from './inventory-content';
import type { RuneContent } from './item-runes';
import { seededPicks } from './pick-source';
import type { PickSource, Seed } from './pick-source';
import { shuffle, weightedShuffle } from './picks';
import { slotCandidates } from './slot-candidates';
import { slotRefusal } from './slot-offer';
import type { SlotContent, SlotPick } from './slot-offer';
import type { TreasureByLevel } from './treasure-by-level';

/** What `generateCharacter` is asked for: the character to start from, how far to take it, and what to read. */
export interface GenerateInput {
  /** The character to fill: its own picks stay, so a started build (a chosen ancestry, say) is kept. */
  readonly start: Character;
  readonly seed: Seed;
  readonly level: CharacterLevel;
  readonly content: SlotContent;
  /** The items on sale: when given, the character is outfitted for its level once its slots are filled (`generateGear`). */
  /** Weights for what the picks raise or use: the favoured ones are picked more often. Absent, every pick is as likely. */
  readonly theme?: GenerationTheme | undefined;
  /** Picks to keep: each slot is filled with its selection when it opens, and only the others are drawn. */
  readonly locks?: readonly SlotPick[] | undefined;
  readonly items?: ItemContent | undefined;
  /** What a character of each level may own; the core rules' by default. */
  readonly treasure?: TreasureByLevel | undefined;
  /** The runes on sale, for a weapon theme's weapon to be etched with. */
  readonly runes?: RuneContent | undefined;
  readonly now: Temporal.Instant;
}

/** A generated character, and the slots left open because nothing the slot offers could be picked. */
export interface Generated {
  readonly character: Character;
  readonly unfilled: readonly SlotKey[];
  /** The locks that could not be kept: their slot never opened, or the pick is not one it offers. */
  readonly unmet: readonly SlotKey[];
}

/** A slot with nothing picked. */
type OpenSlot = Extract<CharacterSlot, { status: typeof SlotStatus.Open }>;

function isOpen(slot: CharacterSlot): slot is OpenSlot {
  return slot.status === SlotStatus.Open;
}

/** How many dead ends a search may still back out of. */
const Backtracks = z.int().nonnegative().brand<'Backtracks'>();
type Backtracks = z.infer<typeof Backtracks>;

/**
 * Most dead ends the strict search backs out of before giving up on filling every slot. A build that can be filled
 * needs a handful; a slot no pick can satisfy (its grants undo its own offer) would otherwise be searched whole.
 */
const BACKTRACKS_MAX = Backtracks.parse(150);

/** What a search reads and draws with, and what it may spend. */
interface Search {
  readonly content: SlotContent;
  readonly source: PickSource;
  readonly now: Temporal.Instant;
  readonly target: CharacterLevel;
  /** The theme the picks are weighed by; undefined for none. */
  readonly theme: GenerationTheme | undefined;
  /** The picks to keep, by slot: such a slot offers only its pick, and a build that cannot take it is backed out of. */
  readonly locks: ReadonlyMap<SlotKey, ChoiceValue>;
  /** Whether a slot whose every pick leads to a dead end is left open, rather than backed out of. */
  readonly lenient: boolean;
  /** Dead ends still to back out of; undefined for no limit. */
  left: Backtracks | undefined;
}

/** Where a search stands: the character so far, and the slots it left open because nothing could be picked for them. */
interface Node {
  readonly character: Character;
  readonly skipped: readonly SlotKey[];
}

/** Whether a character holds a pick its slot reads as invalid: a later pick can undo what an earlier one allowed. */
function hasInvalid(slots: readonly CharacterSlot[]): boolean {
  return slots.some((slot) => slot.status === SlotStatus.Invalid);
}

/** `node` without `slot`, which stays open. */
function leave(node: Node, slot: OpenSlot, search: Search): Generated | undefined {
  return extend({ ...node, skipped: [...node.skipped, slot.key] }, search);
}

/**
 * Levels `node` up from where it stands to the target, picking each open slot at random as it opens. Each slot is a
 * choice point: its candidates the builder accepts are tried in random order, and a pick after which a slot reads
 * invalid, or after which the rest of the build can't be filled, is taken back and the next tried. A slot that offers
 * nothing the builder accepts is left open and the search goes on without it.
 */
function extend(node: Node, search: Search): Generated | undefined {
  const { character, skipped } = node;
  const { content, now, target } = search;
  const slots = characterSlots(character.document, content);
  if (hasInvalid(slots)) {
    return undefined;
  }
  const slot = slots.filter((each) => isOpen(each)).find((open) => !skipped.includes(open.key));
  if (slot !== undefined) {
    return pickSlot(node, slot, search) ?? (search.lenient ? leave(node, slot, search) : undefined);
  }
  const { level } = character.document;
  return level >= target
    ? { character, unfilled: skipped, unmet: [] }
    : extend(
        {
          character: character.apply({ field: CharacterPatchField.Level, value: CharacterLevel.parse(level + 1) }, now),
          skipped,
        },
        search,
      );
}

/** The slots of `locks` that `character` does not hold the pick of: the slot never opened, or the pick was refused. */
function unmetLocks(character: Character, content: SlotContent, locks: readonly SlotPick[]): readonly SlotKey[] {
  const slots = characterSlots(character.document, content);
  return locks
    .filter(({ slot, selection }) =>
      slots.every((each) => each.key !== slot || each.status !== SlotStatus.Filled || each.selection !== selection),
    )
    .map(({ slot }) => slot);
}

/** Spends a dead end; false when none is left. */
function backOut(search: Search): boolean {
  if (search.left === undefined) {
    return true;
  }
  if (search.left === 0) {
    return false;
  }
  search.left = Backtracks.parse(search.left - 1);
  return true;
}

/**
 * What `slot` offers that the builder accepts, in random order, each checked only when asked for.
 * @yields {ChoiceValue} a candidate of `slot` that `slotRefusal` accepts.
 */
/** The candidates of `slot` in the order they are tried: random, and heaviest first by chance when a theme weighs them. */
function tryOrder(
  character: Character,
  slot: OpenSlot,
  { content, source, theme, locks }: Search,
): readonly ChoiceValue[] {
  const locked = locks.get(slot.key);
  if (locked !== undefined) {
    return [locked];
  }
  const candidates = slotCandidates(character.document, content, slot);
  return theme === undefined
    ? shuffle(source, candidates)
    : weightedShuffle(source, weighCandidates(slot, candidates, { theme, content }));
}

function* acceptable(character: Character, slot: OpenSlot, search: Search): Generator<ChoiceValue> {
  const { content } = search;
  for (const selection of tryOrder(character, slot, search)) {
    if (slotRefusal(character.document, content, { slot: slot.key, selection }) === undefined) {
      yield selection;
    }
  }
}

/**
 * The first completion of the build over one of `slot`'s candidates, tried in random order; undefined when none
 * completes. A slot with no candidate the builder accepts is left open instead, as nothing could fill it.
 */
function pickSlot(node: Node, slot: OpenSlot, search: Search): Generated | undefined {
  const { character } = node;
  let tried = false;
  for (const selection of acceptable(character, slot, search)) {
    tried = true;
    const picked = character.apply({ field: CharacterPatchField.SelectSlot, slot: slot.key, selection }, search.now);
    const done = extend({ ...node, character: picked }, search);
    if (done !== undefined) {
      return done;
    }
    if (!backOut(search)) {
      return undefined;
    }
  }
  return tried || search.locks.has(slot.key) ? undefined : leave(node, slot, search);
}

/**
 * `start` taken from where it stands up to `level`, every slot it opens picked at random from what the slot offers
 * (the builder's own check, so a pick is never one `selectSlot` would refuse). It is a recursive backtracking
 * search: levels are filled in order, each open slot is a choice point, and a pick that leaves a slot invalid or the
 * build unfillable is undone and another tried. A slot nothing can be picked for is left in `unfilled`. If no build
 * fills every slot within the search's budget (a feat whose own choices undo each other, say), the search runs again
 * leaving such slots open. The same seed and character give the same one.
 */
export function generateCharacter({
  start,
  seed,
  level,
  content,
  now,
  items,
  treasure,
  runes,
  theme,
  locks = [],
}: GenerateInput): Generated {
  const source = seededPicks(seed);
  const kept = new Map(locks.map(({ slot, selection }) => [slot, selection]));
  const base = { content, source, now, target: level, theme, locks: kept };
  const root: Node = { character: start, skipped: [] };
  const searched = extend(root, { ...base, lenient: false, left: BACKTRACKS_MAX }) ??
    extend(root, { ...base, lenient: true, left: undefined }) ?? { character: start, unfilled: [], unmet: [] };
  const built = { ...searched, unmet: unmetLocks(searched.character, content, locks) };
  return items === undefined
    ? built
    : {
        ...built,
        character: generateGear({
          character: built.character,
          seed,
          items,
          slots: content,
          now,
          treasure,
          weapon: theme?.weapon,
          runes,
        }),
      };
}
