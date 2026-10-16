import { SpendKind } from '@pioneer/character/domain';
import type { SpendCost, SpendId, SpendLog } from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { message, Temporal } from '@pioneer/shared/kernel';

/** One spend of the log as shown: what was used, what it cost in words, and the id undoing it names. */
export interface SpendRow {
  readonly id: SpendId;
  readonly name: string | undefined;
  readonly cost: MessageDescriptor;
  /** When it was used, as the server stamped it. */
  readonly at: Temporal.Instant;
}

const ONE_ACTION = 1;

/** The words of what a spend cost: its actions, the reaction, or a free action. */
export function costMessage(cost: SpendCost): MessageDescriptor {
  switch (cost.kind) {
    case SpendKind.Actions: {
      return cost.count === ONE_ACTION
        ? message('character.sheet.spend.costOne')
        : message('character.sheet.spend.costMany', { count: cost.count });
    }
    case SpendKind.Reaction: {
      return message('character.sheet.spend.costReaction');
    }
    case SpendKind.Free: {
      return message('character.sheet.spend.costFree');
    }
    default: {
      return cost satisfies never;
    }
  }
}

/** The rows of `log`, newest first, with each action's name when `names` has it. */
export function spendRows(log: SpendLog, names: ReadonlyMap<ContentId, string>): readonly SpendRow[] {
  return log
    .map((entry): SpendRow => ({
      id: entry.id,
      name: names.get(entry.action),
      cost: costMessage(entry.cost),
      at: Temporal.Instant.from(entry.at),
    }))
    .toReversed();
}
