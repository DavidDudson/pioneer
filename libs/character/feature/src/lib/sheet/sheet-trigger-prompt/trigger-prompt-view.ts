import { abilityUseKey } from '@pioneer/character/domain';
import type { ResourcesSpent, SpendLog } from '@pioneer/character/domain';
import { ActionCost } from '@pioneer/rules/sdk';
import type { ContentId, Frequency } from '@pioneer/rules/sdk';
import type { ActionLine } from '@pioneer/rules/ui';

/** How each action cost is worded, spelled out so the key check sees them. */
const COST_KEYS: Readonly<Record<ActionCost, string>> = {
  [ActionCost.One]: 'rules.facet.actionCost.one',
  [ActionCost.Two]: 'rules.facet.actionCost.two',
  [ActionCost.Three]: 'rules.facet.actionCost.three',
  [ActionCost.Free]: 'rules.facet.actionCost.free',
  [ActionCost.Reaction]: 'rules.facet.actionCost.reaction',
};

/** The uses of an ability with a frequency: what is left of its most. */
export interface UsesLeft {
  readonly current: number;
  readonly max: number;
}

/** One triggered ability in the prompt: the action as the sheet lists it, what it costs and how many uses it has left. */
export interface TriggerPromptRow {
  readonly line: ActionLine;
  /** The message key that words its cost; absent for an ability with none. */
  readonly costKey: string | undefined;
  /** Its uses left; absent when it has no frequency. */
  readonly uses: UsesLeft | undefined;
}

/** What the prompt reads to show the abilities an event fired. */
export interface TriggerPromptInputs {
  /** The abilities the event fired, in order. */
  readonly abilities: ReadonlyArray<ContentId>;
  /** The character's actions as the sheet lists them. */
  readonly lines: ReadonlyArray<ActionLine>;
  /** The frequency of each ability that has one. */
  readonly frequencies: ReadonlyMap<ContentId, Frequency>;
  readonly resources: Pick<ResourcesSpent, 'uses'>;
  /** The spends since the turn began: an ability spent here is accepted, and offered again when its spend is undone. */
  readonly spendLog: SpendLog;
  /** The abilities the player declined for this event. */
  readonly declined: ReadonlySet<ContentId>;
}

/** The uses `id` has left, or none when it has no frequency. */
function usesLeft(
  id: ContentId,
  { frequencies, resources }: Pick<TriggerPromptInputs, 'frequencies' | 'resources'>,
): UsesLeft | undefined {
  const frequency = frequencies.get(id);

  if (frequency === undefined) {
    return undefined;
  }

  const spent = resources.uses[abilityUseKey(id)] ?? 0;

  return { current: Math.max(frequency.max - spent, 0), max: frequency.max };
}

/**
 * The rows of the prompt for an event (#361): each ability it fired that the player has neither accepted (spent, which
 * the spend log shows, so undoing it brings it back) nor declined, with its cost and uses left.
 */
export function triggerPromptRows(inputs: TriggerPromptInputs): ReadonlyArray<TriggerPromptRow> {
  const { abilities, lines, spendLog, declined } = inputs;

  return abilities.flatMap((id): Array<TriggerPromptRow> => {
    const line = lines.find((each) => each.id === id);
    const accepted = spendLog.some(({ action }) => action === id);

    if (line === undefined || accepted || declined.has(id)) {
      return [];
    }

    return [{ line, costKey: line.cost === undefined ? undefined : COST_KEYS[line.cost], uses: usesLeft(id, inputs) }];
  });
}
