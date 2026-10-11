import {
  ContentId,
  contentId,
  EntrySlug,
  EventRef,
  InventoryItemId,
  Origin,
  PackId,
  SlotKey,
} from '@pioneer/rules/sdk';
import { Temporal, UserId } from '@pioneer/shared/kernel';

import type { OriginNames } from '../origin-chain/origin-names';

const PLAYER_CORE = PackId.parse('player-core');
const GM_CORE = PackId.parse('gm-core');

const entry = (pack: PackId, slug: string): ContentId => ContentId.parse(contentId(pack, EntrySlug.parse(slug)));

const FIGHTER = entry(PLAYER_CORE, 'class:fighter');
const SHIELD_BLOCK = entry(PLAYER_CORE, 'feat:shield-block');
const FRIGHTENED = entry(PLAYER_CORE, 'condition:frightened');
const RAISE_A_SHIELD = entry(PLAYER_CORE, 'action:raise-a-shield');
const WITHOUT_LEVEL = entry(GM_CORE, 'variant-rule:proficiency-without-level');
const SLOT = SlotKey.parse('class');
const SHIELD_ITEM = InventoryItemId.parse('5b0d3c1e-8a7f-4e2b-9c4d-1f6e2a3b4c5d');
const DEMORALIZE = EventRef.parse('7c1e2d3f-4a5b-4c6d-8e7f-9a0b1c2d3e4f');
const GM = UserId.parse('00000000-0000-4000-8000-00000000de01');

/**
 * Two calendar days before now in the local zone, so the override reads "2 days ago" whenever the story or spec runs,
 * a daylight saving change included.
 */
const TWO_DAYS_AGO: Temporal.Instant = Temporal.Now.zonedDateTimeISO().subtract({ days: 2 }).toInstant();

const SOURCES = [{ kind: 'book', book: 'player-core', page: 266 }];

function origin(hops: readonly unknown[], holder: ContentId = SHIELD_BLOCK): Origin {
  return Origin.parse({ hops, entry: holder, sources: SOURCES });
}

/** The entry holding the rule element and nothing before it: content the character has directly. */
export const DIRECT = origin([]);

/** One of each hop, outermost first: the chain a busy line could have. */
export const EVERY_HOP: Origin = origin([
  { kind: 'choice', slot: SLOT },
  { kind: 'grant', by: FIGHTER, rule: 3 },
  { kind: 'inventory', item: SHIELD_ITEM, state: 'held' },
  { kind: 'condition', condition: FRIGHTENED, value: 2, appliedBy: DEMORALIZE },
  { kind: 'effect', effect: RAISE_A_SHIELD, appliedBy: DEMORALIZE },
  { kind: 'variant', rule: WITHOUT_LEVEL },
]);

/** A GM's set override, with when and why. */
export const SET_BY_HAND: Origin = origin([
  { kind: 'override', by: GM, at: TWO_DAYS_AGO.toString({ smallestUnit: 'millisecond' }), note: 'House rule' },
]);

/** An override with no note. */
export const SET_WITHOUT_NOTE: Origin = origin([
  { kind: 'override', by: GM, at: TWO_DAYS_AGO.toString({ smallestUnit: 'millisecond' }) },
]);

/** A condition with no value, put on without a campaign event. */
export const PLAIN_CONDITION: Origin = origin([{ kind: 'condition', condition: FRIGHTENED }]);

/** Shield Block from the shield, worn, held or invested. */
export function fromItem(state: string): Origin {
  return origin([{ kind: 'inventory', item: SHIELD_ITEM, state }]);
}

/** A variant rule's own rule element, as `variantRulesInPlay` builds it: the hop names the entry holding it. */
export const VARIANT_RULE: Origin = origin([{ kind: 'variant', rule: WITHOUT_LEVEL }], WITHOUT_LEVEL);

/** A condition on the character, as grant roots build it: the hop names the entry holding the rule element. */
export const CONDITION_ON_CHARACTER: Origin = origin(
  [{ kind: 'condition', condition: FRIGHTENED, value: 2 }],
  FRIGHTENED,
);

/** Names a container resolves from the registry and the campaign. */
export const ENTRY_NAMES: ReadonlyMap<ContentId, string> = new Map([
  [FIGHTER, 'Fighter'],
  [SHIELD_BLOCK, 'Shield Block'],
  [FRIGHTENED, 'Frightened'],
  [RAISE_A_SHIELD, 'Raise a Shield'],
  [WITHOUT_LEVEL, 'Proficiency Without Level'],
]);

export const ORIGIN_NAMES: OriginNames = {
  users: new Map([[GM, 'Ada']]),
  slots: new Map([[SLOT, 'Class']]),
  items: new Map([[SHIELD_ITEM, 'Steel Shield']]),
  events: new Map([[DEMORALIZE, 'Demoralize']]),
};
