import type { LiftedRestriction } from '@pioneer/rules/engine';
import type { GrantRoot } from '@pioneer/rules/grants';
import { ContentId, ContentKind, OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentRegistry, ContentText, EnvironmentData, Origin, Slug, Trait } from '@pioneer/rules/sdk';
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

/** The group of each environment that has one, by id: the environments of a group replace one another. */
export type EnvironmentGroups = ReadonlyMap<ContentId, Slug>;

export const NO_ENVIRONMENT_GROUPS: EnvironmentGroups = new Map();

export function environmentGroups(content: EnvironmentContent): EnvironmentGroups {
  return new Map([...content].flatMap(([id, { group }]) => (group === undefined ? [] : [[id, group] as const])));
}

/** The environments in `environments` that turning on `environment` turns off: the others of its group, if it has one. */
export function displacedBy(
  environments: ActiveEnvironments,
  groups: EnvironmentGroups,
  environment: ContentId,
): ActiveEnvironments {
  const group = groups.get(environment);
  return group === undefined ? [] : environments.filter((each) => each !== environment && groups.get(each) === group);
}

/**
 * What an environment the character is in forbids: the restriction's id, the reason the sheet shows, and whose it is.
 * When something lifts it, `liftedBy` holds what does, and the restriction no longer holds.
 */
export interface RestrictionInPlay {
  readonly environment: ContentId;
  readonly id: Slug;
  readonly reason: ContentText;
  /** The action traits it forbids; none for a restriction that is text only. */
  readonly blocks: readonly Trait[];
  /** What lifts the restriction; empty while it holds. */
  readonly liftedBy: readonly Origin[];
}

/** Whether `lift` lifts the restriction `id` of `environment`: it names that restriction, in that environment or any. */
function lifts(lift: LiftedRestriction, environment: ContentId, id: Slug): boolean {
  return lift.restriction === id && (lift.environment === undefined || lift.environment === environment);
}

/**
 * The restrictions of the environments the character is in, environment by environment in the order turned on, each
 * with the origins of the `lifted` restrictions that lift it.
 */
export function restrictionsInPlay(
  environments: ActiveEnvironments,
  content: EnvironmentContent,
  lifted: readonly LiftedRestriction[] = [],
): readonly RestrictionInPlay[] {
  return environments.flatMap((environment) =>
    (content.get(environment)?.restrictions ?? []).map(({ id, reason, blocks }) => ({
      environment,
      id,
      reason,
      blocks,
      liftedBy: lifted.filter((lift) => lifts(lift, environment, id)).flatMap((lift) => lift.origins),
    })),
  );
}

/** The restriction in `restrictions` that forbids an action with one of `traits`, if one does. */
export function restrictionBlocking(
  restrictions: readonly RestrictionInPlay[],
  traits: readonly Trait[],
): RestrictionInPlay | undefined {
  return restrictions.find(({ blocks }) => blocks.some((trait) => traits.includes(trait)));
}

/** The restrictions that hold: those of `restrictions` nothing lifts. */
export function restrictionsHolding(restrictions: readonly RestrictionInPlay[]): readonly RestrictionInPlay[] {
  return restrictions.filter(({ liftedBy }) => liftedBy.length === 0);
}
