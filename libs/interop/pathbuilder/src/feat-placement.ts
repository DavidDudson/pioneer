import { characterGrants, featSlots } from '@pioneer/character/domain';
import type { CharacterDocument, FeatSlot, SlotContent } from '@pioneer/character/domain';
import { ChoiceValue, ContentId } from '@pioneer/rules/sdk';
import type { SlotKey } from '@pioneer/rules/sdk';

import { matchKey } from './content-lookup';
import type { ContentLookup } from './content-lookup';
import { ImportKind } from './import-kind';
import type { PathbuilderName } from './import-kind';
import type { ImportedFeat } from './read-feats';

export type FeatPicks = Readonly<Record<SlotKey, ChoiceValue>>;

/** The picks for the character's feat slots (and the feats' own choices), and the feats no slot took. */
export interface FeatPlacement {
  readonly choices: FeatPicks;
  readonly unplaced: readonly ImportedFeat[];
}

/** A feat the export lists that matched content, and the content it matched. */
interface Wanted {
  readonly feat: ImportedFeat;
  readonly id: ContentId;
}

/** Slots open up as feats are placed (a feat that grants a feat), so placing goes round until nothing more fits. */
const MAX_ROUNDS = 8;

/** Skill and general feat slots share a level and their feats; the type Pathbuilder names says which it filled. */
const SHARED_KINDS: ReadonlySet<string> = new Set(['skill', 'general']);

/** A word of a slot label that only says the level. */
const LEVEL_WORD = /^\d+$/u;

function documentWith(document: CharacterDocument, picks: FeatPicks): CharacterDocument {
  return { ...document, build: { ...document.build, choices: { ...document.build.choices, ...picks } } };
}

/** "skill" or "general" for a Skill Feat or General Feat and the slots that name them; "other" for the rest. */
function kindWord(text: string | undefined): string {
  const word = matchKey(text ?? '').split(' ')[0] ?? '';
  return SHARED_KINDS.has(word) ? word : 'other';
}

/** Whether Pathbuilder's label for the slot ("Animist Feat 4", "Free Archetype 4") is the slot's prompt less the level. */
function labelled(slot: FeatSlot, feat: ImportedFeat): boolean {
  const words = matchKey(feat.slot ?? '')
    .split(' ')
    .filter((word) => !LEVEL_WORD.test(word));
  const prompt = matchKey(slot.prompt ?? '').split(' ');
  return words.length > 0 && words.every((word) => prompt.includes(word));
}

/**
 * The open slots at `wanted`'s level that offer it: the one Pathbuilder labels first (a class feat slot also offers
 * archetype feats, so a dedication fits it and a Free Archetype slot alike), then those named for its type.
 */
function candidates(slots: readonly FeatSlot[], { feat, id }: Wanted): FeatSlot[] {
  const fits = slots.filter((slot) => slot.level === feat.level && slot.options.some((option) => option.value === id));
  const named = new Set(fits.filter((slot) => kindWord(slot.prompt) === kindWord(feat.type)));
  const rank = (slot: FeatSlot): number => {
    if (labelled(slot, feat)) {
      return 0;
    }
    return named.has(slot) ? 1 : 2;
  };
  return fits.toSorted((left, right) => rank(left) - rank(right));
}

/** Each wanted feat in the first open slot it fits that no other took, the most constrained feats choosing first. */
function claim(slots: readonly FeatSlot[], wanted: readonly Wanted[]): Map<SlotKey, Wanted> {
  const fitting = wanted.map((each) => ({ each, fits: candidates(slots, each) }));
  const claimed = new Map<SlotKey, Wanted>();
  for (const { each, fits } of fitting.toSorted((left, right) => left.fits.length - right.fits.length)) {
    const free = fits.find((slot) => !claimed.has(slot.key));
    if (free !== undefined) {
      claimed.set(free.key, each);
    }
  }
  return claimed;
}

/** The picks that answer the `ChoiceSet`s the placed feats ask, by the option whose label or value is their choice. */
function answers(
  document: CharacterDocument,
  content: SlotContent,
  chosen: ReadonlyMap<ContentId, PathbuilderName>,
): FeatPicks {
  return Object.fromEntries(
    characterGrants(document, content).open.flatMap((slot) => {
      const choice = chosen.get(slot.origin.entry);
      const option =
        choice === undefined
          ? undefined
          : slot.options.find((each) => [each.label, each.value].some((text) => matchKey(text) === matchKey(choice)));
      return option === undefined ? [] : [[slot.key, ChoiceValue.parse(option.value)]];
    }),
  );
}

function matched(feats: readonly ImportedFeat[], lookup: ContentLookup): Wanted[] {
  return feats
    .filter((feat) => feat.slotted)
    .flatMap((feat) => {
      const match = lookup.resolve(ImportKind.Feat, feat.name);
      return match === undefined ? [] : [{ feat, id: ContentId.parse(match.id) }];
    });
}

/** Where placing stands: the picks so far, the feats still wanting a slot and the choices the placed ones made. */
interface Round {
  readonly picks: FeatPicks;
  readonly left: readonly Wanted[];
  readonly chosen: ReadonlyMap<ContentId, PathbuilderName>;
}

/** What placing needs beside the document: the slots' content and the feats' names. */
export interface FeatPlacementContent {
  readonly slots: SlotContent;
  readonly lookup: ContentLookup;
}

/** `round` after one more pass over the open slots, or undefined when no wanted feat fits one. */
function advance(document: CharacterDocument, { slots }: FeatPlacementContent, round: Round): Round | undefined {
  const current = documentWith(document, round.picks);
  const open = featSlots(current, slots).filter((slot) => !(slot.key in current.build.choices));
  const claimed = claim(open, round.left);
  if (claimed.size === 0) {
    return undefined;
  }
  const placed = new Set(claimed.values());
  const chosen = new Map([
    ...round.chosen,
    ...[...placed].flatMap(({ feat, id }): [ContentId, PathbuilderName][] =>
      feat.choice === undefined ? [] : [[id, feat.choice]],
    ),
  ]);
  const placedPicks: FeatPicks = {
    ...round.picks,
    ...Object.fromEntries([...claimed].map(([key, { id }]) => [key, ChoiceValue.parse(id)])),
  };
  const picks = { ...placedPicks, ...answers(documentWith(document, placedPicks), slots, chosen) };
  return { picks, chosen, left: round.left.filter((each) => !placed.has(each)) };
}

/**
 * Pathbuilder's feats in `document`'s feat slots (#308): each in an open slot of its level that offers it, the
 * slot named for its type (skill, general) first. Placing a feat can open slots (a feat that grants another), so it
 * goes round again with what is left; a feat's own choice ("Skill Training: Intimidation") answers the `ChoiceSet` it
 * opens. Whatever no slot takes is unplaced.
 */
export function placeFeats(
  document: CharacterDocument,
  content: FeatPlacementContent,
  feats: readonly ImportedFeat[],
): FeatPlacement {
  let round: Round = { picks: {}, left: matched(feats, content.lookup), chosen: new Map() };
  for (let pass = 0; pass < MAX_ROUNDS; pass += 1) {
    const next = advance(document, content, round);
    if (next === undefined) {
      break;
    }
    round = next;
  }
  return { choices: round.picks, unplaced: round.left.map(({ feat }) => feat) };
}
