import type { GrantRoot } from '@pioneer/rules/grants';
import { ContentId, ContentKind, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentText, EnvironmentData, Slug } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** The most environments a character is in at once; one past it is not kept, so a request cannot grow the play state. */
export const ENVIRONMENTS_MAX = 16;

/**
 * The environments the character is in (underwater, darkness), by content id, each once. They are situations, not
 * conditions: their rules apply while they are listed, and the player or the GM toggles them.
 */
export const ActiveEnvironmentsSchema = z.array(ContentId).max(ENVIRONMENTS_MAX).readonly().default([]);
export type ActiveEnvironments = z.infer<typeof ActiveEnvironmentsSchema>;

/** The play edits that put the character in an environment or take it out. */
export const EnvironmentCommandField = {
  /** An environment turned on or off. */
  SetEnvironment: 'setEnvironment',
} as const;
export type EnvironmentCommandField = ValueOf<typeof EnvironmentCommandField>;

export const EnvironmentCommandSchema = z.discriminatedUnion('field', [
  z.object({
    field: z.literal(EnvironmentCommandField.SetEnvironment),
    environment: ContentId,
    active: z.boolean(),
  }),
]);
export type EnvironmentCommand = z.infer<typeof EnvironmentCommandSchema>;

/** Whether `command` turns an environment on or off. */
export function isEnvironmentCommand<Command extends { readonly field: unknown }>(
  command: Command,
): command is Extract<Command, EnvironmentCommand> {
  return command.field === EnvironmentCommandField.SetEnvironment;
}

/**
 * `environments` after `command`: the environment listed once when turned on, in the order turned on, and left out when
 * turned off. Turning on one more than the character can be in changes nothing.
 */
export function applyEnvironmentCommand(
  environments: ActiveEnvironments,
  { environment, active }: EnvironmentCommand,
): ActiveEnvironments {
  const listed = environments.includes(environment);
  if (!active) {
    return environments.filter((each) => each !== environment);
  }
  return listed || environments.length >= ENVIRONMENTS_MAX ? environments : [...environments, environment];
}

/** The environments as roots of the effective set, each behind an environment hop, so their rules show in breakdowns. */
export function environmentRoots(environments: ActiveEnvironments): readonly GrantRoot[] {
  return environments.map((environment) => ({
    entry: environment,
    hop: { kind: OriginHopKind.Environment, environment },
  }));
}

/** The environments of the registry's packs, by id; the last pack's entry wins, as in the registry. */
export type EnvironmentContent = ReadonlyMap<ContentId, EnvironmentData>;

export function environmentContent(registry: ContentRegistry): EnvironmentContent {
  const entries = registry.packs.flatMap((pack) => pack.otherEntries);
  return new Map(
    entries.flatMap((entry) => (entry.kind === ContentKind.Environment ? [[entry.id, entry.data] as const] : [])),
  );
}

/** What an environment the character is in forbids: the restriction's id, the reason the sheet shows, and whose it is. */
export interface RestrictionInPlay {
  readonly environment: ContentId;
  readonly id: Slug;
  readonly reason: ContentText;
}

/** The restrictions of the environments the character is in, environment by environment in the order turned on. */
export function restrictionsInPlay(
  environments: ActiveEnvironments,
  content: EnvironmentContent,
): readonly RestrictionInPlay[] {
  return environments.flatMap((environment) =>
    (content.get(environment)?.restrictions ?? []).map(({ id, reason }) => ({ environment, id, reason })),
  );
}
