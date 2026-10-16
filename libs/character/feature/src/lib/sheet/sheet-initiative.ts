import { initiativeRoll, PERCEPTION, suggestedInitiative } from '@pioneer/character/domain';
import type { Character, ExplorationActivity } from '@pioneer/character/domain';
import type { ContentRegistry, Selector } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { sheetRollSetup } from './sheet-roll-setup';

/** A statistic initiative can be rolled with, and its modifier rolled as initiative. */
export interface InitiativeChoice {
  readonly selector: Selector;
  readonly name: string;
  readonly total: number;
}

/**
 * Perception and every skill and Lore the character has a value for, each with its modifier as an initiative roll
 * (modifiers aimed at initiative count), Perception first and the rest by name (#506).
 */
/** What initiative is rolled for: the content and the character. */
export interface InitiativeSheet {
  readonly registry: ContentRegistry;
  readonly character: Character;
}

export function initiativeChoices(
  { registry, character }: InitiativeSheet,
  perception: string,
  skills: readonly NamedStatistic[],
): readonly InitiativeChoice[] {
  const candidates = [
    { selector: PERCEPTION, name: perception },
    ...skills.flatMap(({ name, result }) => (result.ok ? [{ selector: result.selector, name }] : [])),
  ];
  return candidates.flatMap(({ selector, name }): InitiativeChoice[] => {
    const setup = sheetRollSetup(registry, character, { selector, chosen: new Set(), as: initiativeRoll(selector) });
    return setup === undefined ? [] : [{ selector, name, total: Number(setup.statistic.total) }];
  });
}

/** The choice the picker starts on: the statistic the exploration activity suggests, else Perception. */
export function defaultInitiative(
  registry: ContentRegistry,
  activity: ExplorationActivity,
  choices: readonly InitiativeChoice[],
): InitiativeChoice | undefined {
  const suggested = suggestedInitiative(registry, activity);
  return (
    choices.find(({ selector }) => selector === suggested) ?? choices.find(({ selector }) => selector === PERCEPTION)
  );
}
