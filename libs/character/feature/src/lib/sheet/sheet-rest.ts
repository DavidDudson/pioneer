import {
  applyRestCommand,
  RECOVERY_CONDITIONS,
  Resource,
  RestChangeKind,
  restHealing,
} from '@pioneer/character/domain';
import type {
  Character,
  PlayState,
  ResourceCount,
  ResourceMaxima,
  RestChange,
  RestCommand,
  SlotCountKey,
} from '@pioneer/character/domain';
import type { ContentRegistry, HitPoints } from '@pioneer/rules/sdk';

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

/** The words of one change; slots and uses are named as the sheet names them. */
function lineOf(change: RestChange, views: CountedViews, staves: readonly StaffOption[]): RestLine {
  switch (change.kind) {
    case RestChangeKind.HitPoints: {
      return { key: 'character.sheet.rest.hitPoints', params: { gained: change.gained } };
    }
    case RestChangeKind.ConditionRemoved: {
      const fatigued = change.condition === RECOVERY_CONDITIONS.fatigued;
      return {
        key: fatigued ? 'character.sheet.rest.fatiguedRemoved' : 'character.sheet.rest.drainedRemoved',
        params: {},
      };
    }
    case RestChangeKind.ConditionLowered: {
      return { key: 'character.sheet.rest.drainedLowered', params: { value: change.value } };
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
      const use = views.uses.find(({ key }) => key === change.key);
      return { key: 'character.sheet.rest.uses', params: { amount: change.amount, name: use?.name } };
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
  const limits = { hitPoints, healing, recovery: RECOVERY_CONDITIONS, resources, counted, staff };
  const { changes } = applyRestCommand(play, command, limits);
  const views = countedViews(registry, character, play.resources);
  const staves = staffOptions(registry, character, staff);
  return changes.map((change) => lineOf(change, views, staves));
}
