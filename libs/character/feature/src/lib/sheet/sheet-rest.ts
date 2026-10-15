import { applyRestCommand, Resource, RestChangeKind, restHealing, restRecovery } from '@pioneer/character/domain';
import type {
  Character,
  PlayState,
  ResourceCount,
  ResourceMaxima,
  RestChange,
  RestCommand,
  SlotCountKey,
  UseCountKey,
} from '@pioneer/character/domain';
import type { ContentRegistry, HitPoints } from '@pioneer/rules/sdk';

import { conditionName } from './sheet-conditions';
import { countedViews, sheetCounted } from './sheet-counted';
import type { CountedViews } from './sheet-counted';
import { statisticInputsOf } from './sheet-inputs';
import { sheetStaffLimits, staffOptions } from './sheet-staff';
import type { StaffOption } from './sheet-staff';

/** One change a restoring action would make, as a message key and its parameters. */
export interface RestLine {
  readonly key: string;
  readonly params: Readonly<Record<string, string | number | undefined>>;
}

/** What bounds the actions: the maximum Hit Points and the pools, which the sheet derives from the build. */
interface RestMaxima {
  readonly hitPoints: HitPoints;
  readonly resources: ResourceMaxima;
}

const POINTS_KEYS: Readonly<Record<Resource, string>> = {
  [Resource.HeroPoints]: 'character.sheet.rest.heroPoints',
  [Resource.FocusPoints]: 'character.sheet.rest.focusPoints',
};

/** The words for slots regained, naming the entry and rank. */
function slotLine(slot: SlotCountKey, amount: ResourceCount, views: CountedViews): RestLine {
  const view = views.slots.find(({ key }) => key === slot);
  const key = view?.pool === undefined ? 'character.sheet.rest.slots' : 'character.sheet.rest.poolSlots';
  return { key, params: { amount, source: view?.source, pool: view?.pool, rank: view?.rank } };
}

/** The words for a staff prepared, or the slot expended for it. */
function staffLine(
  change: Extract<
    RestChange,
    { readonly kind: typeof RestChangeKind.StaffCharges | typeof RestChangeKind.SlotExpended }
  >,
  views: CountedViews,
  staves: readonly StaffOption[],
): RestLine {
  if (change.kind === RestChangeKind.StaffCharges) {
    const name = staves.find(({ id }) => id === change.item)?.name;
    return { key: 'character.sheet.rest.staffCharges', params: { name, charges: change.charges } };
  }
  const view = views.slots.find(({ key }) => key === change.key);
  return { key: 'character.sheet.rest.slotExpended', params: { source: view?.source, rank: view?.rank } };
}

/** The words for uses regained, naming the feat, action or item and saying so when they are the overcharged ones. */
function usesLine(use: UseCountKey, amount: ResourceCount, views: CountedViews): RestLine {
  const view = views.uses.find(({ key }) => key === use);
  const key = view?.overcharge === true ? 'character.sheet.rest.overchargedUses' : 'character.sheet.rest.uses';
  return { key, params: { amount, name: view?.name } };
}

/** What names the things a change mentions. */
interface RestNames {
  readonly views: CountedViews;
  readonly staves: readonly StaffOption[];
  readonly registry: ContentRegistry;
}

/** The words of one change; slots, uses and conditions are named as the sheet names them. */
function lineOf(change: RestChange, { views, staves, registry }: RestNames): RestLine {
  switch (change.kind) {
    case RestChangeKind.HitPoints: {
      return { key: 'character.sheet.rest.hitPoints', params: { gained: change.gained } };
    }
    case RestChangeKind.ConditionRemoved: {
      return {
        key: 'character.sheet.rest.conditionRemoved',
        params: { name: conditionName(registry, change.condition) },
      };
    }
    case RestChangeKind.ConditionLowered: {
      return {
        key: 'character.sheet.rest.conditionLowered',
        params: { name: conditionName(registry, change.condition), value: change.value },
      };
    }
    case RestChangeKind.Doomed: {
      return { key: 'character.sheet.rest.doomedLowered', params: { doomed: change.doomed } };
    }
    case RestChangeKind.Points: {
      return { key: POINTS_KEYS[change.resource], params: { from: change.from, to: change.to } };
    }
    case RestChangeKind.Slots: {
      return slotLine(change.key, change.amount, views);
    }
    case RestChangeKind.StaffCharges:
    case RestChangeKind.SlotExpended: {
      return staffLine(change, views, staves);
    }
    case RestChangeKind.Uses: {
      return usesLine(change.key, change.amount, views);
    }
    default: {
      return change satisfies never;
    }
  }
}

/** What an action reads of the character. */
export interface RestSource {
  readonly registry: ContentRegistry;
  readonly character: Character;
  readonly play: PlayState;
  readonly maxima: RestMaxima;
}

/** What `command` would change for the character, in the order the server makes the changes; empty when nothing. */
export function restLines(
  { registry, character, play, maxima }: RestSource,
  command: RestCommand,
): readonly RestLine[] {
  const { hitPoints, resources } = maxima;
  const healing = restHealing(statisticInputsOf(registry, character));
  const counted = sheetCounted(registry, character);
  const staff = sheetStaffLimits(registry, character);
  const limits = { hitPoints, healing, recovery: restRecovery(registry), resources, counted, staff };
  const { changes } = applyRestCommand(play, command, limits);
  const views = countedViews(registry, character, play.resources);
  const staves = staffOptions(registry, character, staff);
  return changes.map((change) => lineOf(change, { views, staves, registry }));
}
