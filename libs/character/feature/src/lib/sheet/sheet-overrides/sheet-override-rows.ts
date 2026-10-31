import { activeOverrides, OverrideRole } from '@pioneer/character/domain';
import type { Character, Override, OverrideRevision } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

/** One state of an override, as the list words it: what it did, who set it, when and why. */
export interface OverrideState {
  /** The override's change in words of its kind: "+2 item", or "Pinned to 22". */
  readonly effect: string;
  /** Who set it; undefined when the server could not name them. */
  readonly author: string | undefined;
  readonly at: Temporal.Instant;
  readonly reason: string;
  /** The GM of the character's campaign set it, so the player can neither edit nor remove it. */
  readonly gm: boolean;
}

/** An override in the list: the statistic it is on, its current state, and the states an edit replaced. */
export interface OverrideRow {
  readonly override: Override;
  /** The statistic's name, else its selector. */
  readonly name: string;
  readonly current: OverrideState;
  /** The states edits replaced, newest first. */
  readonly history: readonly OverrideState[];
}

/** What a row needs to word a state; the caller owns the locale and the messages. */
export interface OverrideWords {
  readonly effect: (override: Override, state: Pick<OverrideRevision, 'value' | 'type'>) => string;
  readonly statisticName: (override: Override) => string;
  readonly authors: ReadonlyMap<UserId, string>;
}

function stateOf(
  override: Override,
  state: Pick<OverrideRevision, 'value' | 'type' | 'by' | 'byRole' | 'at' | 'reason'>,
  words: OverrideWords,
): OverrideState {
  return {
    effect: words.effect(override, state),
    author: words.authors.get(state.by),
    at: Temporal.Instant.from(state.at),
    reason: state.reason,
    gm: state.byRole === OverrideRole.Gm,
  };
}

/** The character's overrides in force, in the order they were added, each with the edits it has had. */
export function overrideRows(character: Character, words: OverrideWords): readonly OverrideRow[] {
  return activeOverrides(character.document).map((override) => ({
    override,
    name: words.statisticName(override),
    current: stateOf(override, override, words),
    history: override.revisions.toReversed().map((revision) => stateOf(override, revision, words)),
  }));
}
