import {
  characterGrants,
  characterSpellcasting,
  itemContent,
  OVERCHARGE_DC,
  PlayCommandField,
  spellContent,
  StaffSpellProblem,
  wandOutcome,
  WandOutcome,
  wandProblem,
  wandSources,
} from '@pioneer/character/domain';
import type { Character, InventoryItemId, PlayState, WandCommand, WandSource } from '@pioneer/character/domain';
import { DieFace } from '@pioneer/rules/dice';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { WandBlock, WandCheckOutcome } from '@pioneer/rules/ui';
import type { WandCheckLine, WandLine } from '@pioneer/rules/ui';

import { sheetCounted } from './sheet-counted';
import { sheetSlotContent } from './sheet-slot-content';

/** What stops the spell of a wand being cast, as the list words it. */
const BLOCKS: Readonly<Record<StaffSpellProblem, WandBlock>> = {
  [StaffSpellProblem.NotOnList]: WandBlock.NotOnList,
  [StaffSpellProblem.RankTooHigh]: WandBlock.RankTooHigh,
};

/** What an overcharge comes to, as the list words it. */
const CHECKS: Readonly<Record<Exclude<WandOutcome, typeof WandOutcome.Cast>, WandCheckOutcome>> = {
  [WandOutcome.Broken]: WandCheckOutcome.Broken,
  [WandOutcome.Destroyed]: WandCheckOutcome.Failed,
};

/** Any roll, for asking whether a wand could be overcharged at all. */
const ANY_ROLL = DieFace.parse(1);

/** An overcharge the player has started: the d20 rolled for its flat check, or none when the wand needs no roll. */
interface PendingCheck {
  readonly roll: DieFace | undefined;
}

/** The overcharges waiting to be confirmed, by the wand's inventory item id. */
export type PendingChecks = Readonly<Partial<Record<InventoryItemId, PendingCheck>>>;

/** The command that casts the day's spell of the wand `item`. */
export function castCommand(item: InventoryItemId): WandCommand {
  return { field: PlayCommandField.CastWand, item };
}

/** The command that overcharges the wand `item`; `roll` is absent when none was made. */
export function overchargeCommand(item: InventoryItemId, roll: DieFace | undefined): WandCommand {
  return roll === undefined
    ? { field: PlayCommandField.OverchargeWand, item }
    : { field: PlayCommandField.OverchargeWand, item, roll };
}

/** The flat check of an overcharge the player has started, with what it would come to. */
function checkOf(source: WandSource, { roll }: PendingCheck): WandCheckLine {
  const outcome = wandOutcome(overchargeCommand(source.item.id, roll), source);
  if (outcome === WandOutcome.Cast) {
    throw new TypeError('An overcharge is never the day cast');
  }
  const repeated = source.overcharge.left === 0;
  return {
    roll: repeated ? undefined : roll,
    dc: OVERCHARGE_DC,
    outcome: repeated ? WandCheckOutcome.Repeated : CHECKS[outcome],
  };
}

/** What the wands are shown against: the play state and the overcharges waiting to be confirmed. */
export interface WandsInPlay {
  readonly play: PlayState;
  readonly pending: PendingChecks;
}

/** The wands the character holds as the spell list shows them: a section each, with what can be done now. */
export function sheetWands(
  registry: ContentRegistry,
  character: Character,
  { play, pending }: WandsInPlay,
): WandLine[] {
  const items = itemContent(registry);
  const grants = characterGrants(character.document, sheetSlotContent(registry));
  return wandSources({
    inventory: character.document.inventory.items,
    items,
    spells: spellContent(registry),
    entries: characterSpellcasting(grants),
    uses: play.resources.uses,
    counted: sheetCounted(registry, character),
  }).map((source): WandLine => {
    const { item, wand, spell, problem, broken, use } = source;
    const waiting = pending[item.id];
    return {
      key: item.id,
      name: item.name ?? items.get(item.item)?.name ?? item.item,
      id: wand.spell,
      spell: spell?.name ?? wand.spell,
      rank: wand.rank,
      broken,
      blocked: problem === undefined ? undefined : BLOCKS[problem],
      use,
      castable: wandProblem(castCommand(item.id), source) === undefined,
      overchargeable: wandProblem(overchargeCommand(item.id, ANY_ROLL), source) === undefined,
      check: waiting === undefined ? undefined : checkOf(source, waiting),
    };
  });
}
