import { DieFace } from '@pioneer/rules/dice';
import type { SpellcastingInPlay } from '@pioneer/rules/engine';
import { Attribute, HitPoints, Origin, SlotCount, Slug, SpellPreparation, SpellRank } from '@pioneer/rules/sdk';
import type { MagicTradition } from '@pioneer/rules/sdk';

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
import type { JsonObject } from './json-fixture';
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

/** What a test's spellcasting entry sets; everything else is empty. */
export interface CasterFields {
  readonly slug: string;
  readonly tradition: MagicTradition;
  readonly attribute: Attribute;
  readonly preparation: SpellPreparation;
  readonly ranks: ReadonlyArray<number>;
}

/** A spellcasting entry with one slot of each of `ranks`, and no pools, signature, focus, innate or granted spells. */
export function casterEntry({ slug, tradition, attribute, preparation, ranks }: CasterFields): SpellcastingInPlay {
  return {
    slug: Slug.parse(slug),
    tradition,
    attribute,
    preparation,
    origin: ORIGIN,
    slots: { ranks: ranks.map((rank) => ({ rank: SpellRank.parse(rank), count: SlotCount.parse(1) })) },
    pools: [],
    signatures: false,
    focusSpells: [],
    innateSpells: [],
    grantedSpells: [],
    repertoireCounts: [],
    deityRepertoire: [],
    deitySpells: false,
  };
}

/** A prepared entry of `tradition` with one slot of each of `ranks`. */
export function wandEntry(tradition: 'arcane' | 'divine', ranks: ReadonlyArray<number>): SpellcastingInPlay {
  return casterEntry({
    slug: 'wizard',
    tradition,
    attribute: Attribute.Intelligence,
    preparation: SpellPreparation.Prepared,
    ranks,
  });
}

/** A wand of Fireball in the inventory, held unless `fields` say otherwise. */
export function fireballWand(fields: JsonObject = {}): InventoryItem {
  return InventoryItemSchema.parse({
    id: WAND_ID,
    item: itemFixtureId(ItemFixture.FireballWand),
    quantity: ItemQuantity.parse(1),
    carry: HELD,
    ...fields,
  });
}

/** The wand counts `inventory` has. */
export function wandCounted(inventory: ReadonlyArray<InventoryItem>): CountedMaxima {
  return {
    slots: new Map(),
    uses: wandMaxima(inventory, (id) => itemWands(registry).get(id)),
  };
}

/** The first wand `inventory` holds, as its holder with `entries` sees it after `play`. */
export function wandSourceOf(
  inventory: ReadonlyArray<InventoryItem>,
  play: PlayState = FRESH_PLAY,
  entries: ReadonlyArray<SpellcastingInPlay> = [wandEntry('arcane', WAND_RANKS)],
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
export function heldWandSource(inventory: ReadonlyArray<InventoryItem>, play: PlayState = FRESH_PLAY): WandSource {
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
  inventory: ReadonlyArray<InventoryItem>,
  command: WandCommand,
): PlayState {
  return applyPlayCommand(play, command, within(HitPoints.parse(1), undefined, wandCounted(inventory)));
}
