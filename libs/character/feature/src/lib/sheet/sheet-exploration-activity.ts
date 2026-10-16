import { ActionMode, ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';

/** What the exploration activity picker reads: the actions. */
export const EXPLORATION_CONTENT_KINDS: readonly ContentKind[] = [ContentKind.Action];

/** An exploration activity the character can pick. */
export interface ExplorationOption {
  readonly id: ContentId;
  readonly name: string;
}

/** The actions used while exploring (Defend, Search, Avoid Notice, Follow the Expert, ...), by name. */
export function explorationOptions(registry: ContentRegistry): readonly ExplorationOption[] {
  return registry.packs
    .flatMap((pack) => pack.otherEntries)
    .flatMap((entry): ExplorationOption[] =>
      entry.kind === ContentKind.Action && entry.data.modes?.includes(ActionMode.Exploration) === true
        ? [{ id: entry.id, name: entry.name }]
        : [],
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
}
