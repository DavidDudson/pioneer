import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';

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
