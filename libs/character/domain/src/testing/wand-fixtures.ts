import { DieFace } from '@pioneer/rules/dice';
import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { HitPoints, Origin, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';

import { wandMaxima } from '../counted-resources';
import type { CountedMaxima } from '../counted-resources';
import { InventoryItemId, InventoryItemSchema, ItemQuantity } from '../inventory';
import type { InventoryItem } from '../inventory';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from '../play-state';
import type { PlayState } from '../play-state';
import { spellContent } from '../spell-content';
import { WandCommandField } from '../wand-commands';
import type { WandCommand } from '../wand-commands';
import { itemWands } from '../wand-items';
import { wandSources } from '../wand-sources';
import type { WandSource } from '../wand-sources';
import { staffSpellId } from './fire-staff';
import { ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './item-content';
import { within } from './play-limits';

const registry = itemFixtureRegistry();
const items = itemFixtureContent();
const spells = spellContent(registry);

const ORIGIN = Origin.parse({
  hops: [],
  entry: staffSpellId('fireball'),
  sources: [{ kind: 'web', url: 'https://example.com/' }],
});

/** The inventory id of the wand the fixtures build. */
export const WAND_ID = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');

/** A wand carried in one hand. */
export const HELD = { state: 'held', hands: 1 } as const;

const FIREBALL_RANK = SpellRank.parse(3);

/** The ranks of slots the default caster has: up to the wand's. */
const WAND_RANKS = Array.from({ length: FIREBALL_RANK }, (_unused, index) => index + 1);

/** A prepared entry of `tradition` with one slot of each of `ranks`. */
export function wandEntry(tradition: 'arcane' | 'divine', ranks: readonly number[]): SpellcastingInPlay {
  return {
    slug: 'wizard',
    tradition,
    attribute: 'int',
    preparation: SpellPreparation.Prepared,
    origin: ORIGIN,
    slots: { ranks: ranks.map((rank) => ({ rank, count: 1 })) },
    pools: [],
    signatures: false,
    focusSpells: [],
    deitySpells: false,
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the engine's entry has more fields than a wand reads
  } as unknown as SpellcastingInPlay;
}

/** A wand of Fireball in the inventory, held unless `fields` say otherwise. */
export function fireballWand(fields: object = {}): InventoryItem {
  return InventoryItemSchema.parse({
    id: WAND_ID,
    item: itemFixtureId(ItemFixture.FireballWand),
    quantity: ItemQuantity.parse(1),
    carry: HELD,
    ...fields,
  });
}

/** The wand counts `inventory` has. */
export function wandCounted(inventory: readonly InventoryItem[]): CountedMaxima {
  return {
    slots: new Map(),
    uses: wandMaxima(inventory, (id) => itemWands(registry).get(id)),
  };
}

/** The first wand `inventory` holds, as its holder with `entries` sees it after `play`. */
export function wandSourceOf(
  inventory: readonly InventoryItem[],
  play: PlayState = FRESH_PLAY,
  entries: readonly SpellcastingInPlay[] = [wandEntry('arcane', WAND_RANKS)],
): WandSource | undefined {
  return wandSources({
    inventory,
    items,
    spells,
    entries,
    uses: play.resources.uses,
    counted: wandCounted(inventory),
  })[0];
}

/** `wandSourceOf` for a test that needs the wand held. */
export function heldWandSource(inventory: readonly InventoryItem[], play: PlayState = FRESH_PLAY): WandSource {
  const source = wandSourceOf(inventory, play);
  if (source === undefined) {
    throw new TypeError('Expected a held wand');
  }
  return source;
}

export const CAST_WAND: WandCommand = {
  field: WandCommandField.CastWand,
  item: WAND_ID,
};

/** An overcharge of the wand; `roll` is the flat check's d20, absent when none was rolled. */
export function overchargeWand(roll?: number): WandCommand {
  return roll === undefined
    ? { field: PlayCommandField.OverchargeWand, item: WAND_ID }
    : {
        field: PlayCommandField.OverchargeWand,
        item: WAND_ID,
        roll: DieFace.parse(roll),
      };
}

/** Play after `command`, made against the wands `inventory` has. */
export function afterWandCommand(
  play: PlayState,
  inventory: readonly InventoryItem[],
  command: WandCommand,
): PlayState {
  return applyPlayCommand(play, command, within(HitPoints.parse(1), undefined, wandCounted(inventory)));
}
