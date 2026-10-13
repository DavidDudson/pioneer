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

/** The words of one change; slots and uses are named as the sheet names them. */
function lineOf(change: RestChange, views: CountedViews): RestLine {
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
    case RestChangeKind.Uses: {
      const use = views.uses.find(({ key }) => key === change.key);
      return { key: 'character.sheet.rest.uses', params: { amount: change.amount, name: use?.name } };
    }
    default: {
      return change satisfies never;
    }
  }
}

/** What `command` would change for the character, in the order the server makes the changes; empty when nothing. */
/** What an action reads of the character. */
export interface RestSource {
  readonly registry: ContentRegistry;
  readonly character: Character;
  readonly play: PlayState;
  readonly maxima: RestMaxima;
}

export function restLines(
  { registry, character, play, maxima }: RestSource,
  command: RestCommand,
): readonly RestLine[] {
  const { hitPoints, resources } = maxima;
  const healing = restHealing(statisticInputsOf(registry, character));
  const counted = sheetCounted(registry, character);
  const limits = { hitPoints, healing, recovery: RECOVERY_CONDITIONS, resources, counted };
  const { changes } = applyRestCommand(play, command, limits);
  const views = countedViews(registry, character, play.resources);
  return changes.map((change) => lineOf(change, views));
}
