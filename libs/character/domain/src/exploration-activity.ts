import { ActionMode, Selector } from '@pioneer/rules/sdk';
import type { ActionData, ContentId, ContentRegistry } from '@pioneer/rules/sdk';

import { abilityActions } from './available-actions';
import type { ExplorationActivity } from './exploration-commands';

/** Perception, the statistic initiative is rolled with unless the activity or the player picks a skill. */
export const PERCEPTION = Selector.parse('perception');

/** The action `activity` names, when the content has it and it is used while exploring. */
export function explorationAction(registry: ContentRegistry, activity: ContentId): ActionData | undefined {
  const action = abilityActions(registry).get(activity);
  return action?.modes?.includes(ActionMode.Exploration) === true ? action : undefined;
}

/** Whether `activity` is an action of the content that is used while exploring. */
export function isExplorationActivity(registry: ContentRegistry, activity: ContentId): boolean {
  return explorationAction(registry, activity) !== undefined;
}

/**
 * The statistic the initiative roll starts on (#506): the skill the chosen exploration activity uses (Avoid Notice
 * uses Stealth), else Perception. It is a suggestion; the player can pick any statistic.
 */
export function suggestedInitiative(registry: ContentRegistry, activity: ExplorationActivity): Selector {
  const skill = activity === undefined ? undefined : explorationAction(registry, activity)?.skills?.[0];
  return skill ?? PERCEPTION;
}
