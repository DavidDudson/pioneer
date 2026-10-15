import { ActionOriginKind, ActionStatus, availableActions } from '@pioneer/rules/engine';
import type { ActionCandidate, ActionOrigin } from '@pioneer/rules/engine';
import { PredicateFacts } from '@pioneer/rules/predicate';
import type { NamespaceTable } from '@pioneer/rules/predicate';
import { ActionData, ActionMode, ContentId, ProficiencySchema, SkillSelector } from '@pioneer/rules/sdk';
import type { ActionCost } from '@pioneer/rules/sdk';
import type { FieldIssue, MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { parseFacts } from './predicate-verdict';
import { CheckStatus, readJson } from './rules-check';

/** Message keys for each action status, spelled out so the key check sees them. */
export const ACTION_STATUS_KEYS: Readonly<Record<ActionStatus, string>> = {
  [ActionStatus.Available]: 'play.rules.actions.status.available',
  [ActionStatus.Conditional]: 'play.rules.actions.status.conditional',
  [ActionStatus.Unavailable]: 'play.rules.actions.status.unavailable',
};

/** How each status is coloured: usable, usable if something holds, not usable. */
export const ACTION_STATUS_TONES = {
  [ActionStatus.Available]: 'success',
  [ActionStatus.Conditional]: 'warning',
  [ActionStatus.Unavailable]: 'danger',
} as const satisfies Readonly<Record<ActionStatus, string>>;

/** Message keys for each action cost, spelled out so the key check sees them. */
export const ACTION_COST_KEYS: Readonly<Record<ActionCost, string>> = {
  one: 'play.rules.actions.cost.one',
  two: 'play.rules.actions.cost.two',
  three: 'play.rules.actions.cost.three',
  free: 'play.rules.actions.cost.free',
  reaction: 'play.rules.actions.cost.reaction',
};

/** Message keys for each sheet mode, spelled out so the key check sees them. */
export const ACTION_MODE_KEYS: Readonly<Record<ActionMode, string>> = {
  [ActionMode.Encounter]: 'play.rules.actions.mode.encounter',
  [ActionMode.Exploration]: 'play.rules.actions.mode.exploration',
  [ActionMode.Downtime]: 'play.rules.actions.mode.downtime',
};

const OfferedOrigin = z.enum([ActionOriginKind.Basic, ActionOriginKind.Skill]);

/** One action on the list the tool is given: how the character comes to have it, and how it is used. */
const Offered = z.strictObject({
  id: ContentId,
  name: z.string().trim().min(1),
  origin: OfferedOrigin.default(ActionOriginKind.Basic),
  action: ActionData,
});

/** A skill and the rank the character has in it; a skill left out is untrained. */
const Ranked = z.strictObject({ skill: SkillSelector, rank: ProficiencySchema });

/** What the tool reads: the actions on offer, the skills trained, and the actions whose frequency is used up. */
const ActionsInput = z.strictObject({
  actions: z.array(Offered),
  ranks: z.array(Ranked).default([]),
  spent: z.array(ContentId).default([]),
});
type ActionsInput = z.output<typeof ActionsInput>;

export const ActionsStatus = { ...CheckStatus, InvalidFacts: 'invalid-facts', Pending: 'pending' } as const;
export type ActionsStatus = ValueOf<typeof ActionsStatus>;

/** One action of the list as the playground shows it. */
export interface ActionRow {
  readonly id: ContentId;
  readonly name: string;
  readonly origin: ActionOriginKind;
  readonly cost: ActionCost | undefined;
  readonly modes: readonly ActionMode[];
  readonly status: ActionStatus;
  readonly reasons: readonly MessageDescriptor[];
  /** The total of the roll, when it has one. */
  readonly roll: number | undefined;
}

export type ActionsCheck =
  /** The core rules pack's roll option namespaces have not loaded yet, so nothing is weighed. */
  | { readonly status: typeof ActionsStatus.Pending }
  | { readonly status: typeof ActionsStatus.Valid; readonly rows: readonly ActionRow[] }
  | { readonly status: typeof ActionsStatus.NotJson }
  | { readonly status: typeof ActionsStatus.Invalid; readonly issues: readonly FieldIssue[] }
  /** `lines` are the 1-based lines of the roll option list that are not roll options. */
  | { readonly status: typeof ActionsStatus.InvalidFacts; readonly lines: readonly number[] };

function candidateOf({ id, origin, action }: ActionsInput['actions'][number]): ActionCandidate {
  const kind: ActionOrigin = { kind: origin };
  return { id, origin: kind, action };
}

/**
 * Read `text` as the actions on offer, the skill ranks and the spent frequencies, and `factsText` as roll options (one
 * per line), then weigh each action against them. Never throws.
 */
export function checkActions(text: string, factsText: string, namespaces: NamespaceTable): ActionsCheck {
  const read = readJson(ActionsInput, text);
  if (read.status !== CheckStatus.Valid) {
    return read;
  }
  const facts = parseFacts(factsText);
  if ('lines' in facts) {
    return { status: ActionsStatus.InvalidFacts, lines: facts.lines };
  }
  const input = read.value;
  const names = new Map(input.actions.map(({ id, name }) => [id, name]));
  const listed = availableActions({
    candidates: input.actions.map((offered) => candidateOf(offered)),
    facts: new PredicateFacts(facts.options, namespaces),
    ranks: new Map(input.ranks.map(({ skill, rank }) => [skill, rank])),
    spent: new Set(input.spent),
    statistics: new Map(),
  });
  const rows = listed.map((entry): ActionRow => ({
    id: entry.action,
    name: names.get(entry.action) ?? entry.action,
    origin: entry.origin.kind,
    cost: entry.cost,
    modes: entry.modes,
    status: entry.status,
    reasons: entry.reasons,
    roll: entry.roll === undefined ? undefined : Number(entry.roll.total),
  }));
  return { status: ActionsStatus.Valid, rows };
}
