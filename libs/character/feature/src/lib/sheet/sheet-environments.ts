import type { RestrictionInPlay } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';

import { sheetEntryNames } from './sheet-entry-names';

/** What the environment toggles read: the environments. */
export const ENVIRONMENT_CONTENT_KINDS: readonly ContentKind[] = [ContentKind.Environment];

/** An environment the character can be in. */
export interface EnvironmentOption {
  readonly id: ContentId;
  readonly name: string;
}

/** The environments of the content (underwater, darkness, extreme cold), by name. */
export function environmentOptions(registry: ContentRegistry): readonly EnvironmentOption[] {
  return registry.packs
    .flatMap((pack) => pack.otherEntries)
    .flatMap((entry): EnvironmentOption[] =>
      entry.kind === ContentKind.Environment ? [{ id: entry.id, name: entry.name }] : [],
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/** A restriction as the sheet lists it: why it is there, and the names of what lifts it (none while it holds). */
export interface RestrictionRow {
  readonly key: string;
  readonly reason: string;
  readonly liftedBy: readonly string[];
}

/** `restrictions` as rows, naming each source that lifts one by its entry in `registry`, once however often it lifts. */
export function restrictionRows(
  registry: ContentRegistry,
  restrictions: readonly RestrictionInPlay[],
): readonly RestrictionRow[] {
  const names = sheetEntryNames(registry);
  return restrictions.map(({ environment, id, reason, liftedBy }) => ({
    key: `${environment}:${id}`,
    reason,
    liftedBy: [...new Set(liftedBy.map(({ entry }) => names.get(entry) ?? entry))],
  }));
}
