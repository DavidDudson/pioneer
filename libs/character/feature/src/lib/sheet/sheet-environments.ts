import { characterLiftedRestrictions, environmentContent, restrictionsInPlay } from '@pioneer/character/domain';
import type { ActiveEnvironments, Character, RestrictionInPlay } from '@pioneer/character/domain';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';

import { sheetEntryNames } from './sheet-entry-names';
import { sheetSources } from './sheet-sources';

/** What the environment toggles read: the environments. */
export const ENVIRONMENT_CONTENT_KINDS: ReadonlyArray<ContentKind> = [ContentKind.Environment];

/** An environment the character can be in. */
export interface EnvironmentOption {
  readonly id: ContentId;
  readonly name: string;
}

/** The environments of the content (underwater, darkness, extreme cold), by name. */
export function environmentOptions(registry: ContentRegistry): ReadonlyArray<EnvironmentOption> {
  return registry.packs
    .flatMap((pack) => pack.otherEntries)
    .flatMap((entry): Array<EnvironmentOption> =>
      entry.kind === ContentKind.Environment ? [{ id: entry.id, name: entry.name }] : [],
    )
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

/** What the restrictions in play are read from. */
export interface RestrictionSources {
  /** The registry with the environments. */
  readonly registry: ContentRegistry;
  /** The registry the character's rules are read from, undefined while it loads, when nothing is lifted yet. */
  readonly engine: ContentRegistry | undefined;
  readonly character: Character | undefined;
}

/** The restrictions of the environments the character is in, with what lifts each. */
export function sheetRestrictions(
  { registry, engine, character }: RestrictionSources,
  environments: ActiveEnvironments,
): ReadonlyArray<RestrictionInPlay> {
  const lifted =
    engine === undefined || character === undefined
      ? []
      : characterLiftedRestrictions(character.document, sheetSources(engine, character));

  return restrictionsInPlay(environments, environmentContent(registry), lifted);
}

/** A restriction as the sheet lists it: why it is there, and the names of what lifts it (none while it holds). */
export interface RestrictionRow {
  readonly key: string;
  readonly reason: string;
  readonly liftedBy: ReadonlyArray<string>;
}

/** `restrictions` as rows, naming each source that lifts one by its entry in `registry`, once however often it lifts. */
export function restrictionRows(
  registry: ContentRegistry,
  restrictions: ReadonlyArray<RestrictionInPlay>,
): ReadonlyArray<RestrictionRow> {
  const names = sheetEntryNames(registry);

  return restrictions.map(({ environment, id, reason, liftedBy }) => ({
    key: `${environment}:${id}`,
    reason,
    liftedBy: [...new Set(liftedBy.map(({ entry }) => names.get(entry) ?? entry))],
  }));
}
