import { ChangeMode, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { withSkillRaise } from './translate-skill-raises';

/** The statistic each Foundry actor path names, where Pioneer derives one (core-rules, `statistic:reach`). */
const STATISTIC_PATHS: ReadonlyMap<string, string> = new Map([
  ['system.attributes.reach.base', 'reach'],
  ['system.attributes.dying.max', 'dying-max'],
]);

/**
 * Foundry's `ActiveEffectLike` on an actor path. `phase` says when Foundry applies it within its own derivation, which
 * a `Change` does not carry: it runs in the base phase, before modifiers, as every stat's base does.
 */
const FoundryStatChange = z.strictObject({
  key: z.literal('ActiveEffectLike'),
  mode: z.enum([ChangeMode.Add, ChangeMode.Multiply, ChangeMode.Upgrade, ChangeMode.Downgrade, ChangeMode.Override]),
  path: z.string(),
  value: z.number(),
  phase: z.enum(['applyAEs', 'beforeDerived', 'afterDerived', 'beforeRoll']).optional(),
  predicate: z.unknown().optional(),
});

/**
 * Foundry's `ActiveEffectLike` on a path that is a number Pioneer derives (a Bendy Arm Mutagen's added reach, Mortalis
 * Coin's raised dying limit) as a `Change` on that statistic. A path Pioneer has no statistic for (a Foundry flag, which
 * is dropped by design, or a boolean such as `flanking.flankable`) or a formula value leaves it for the backlog.
 */
function withStatChange(raw: unknown): unknown {
  const change = FoundryStatChange.safeParse(raw);
  if (!change.success) {
    return raw;
  }
  const { path, mode, value, predicate } = change.data;
  const selector = STATISTIC_PATHS.get(path);
  if (selector === undefined) {
    return raw;
  }
  return { key: RuleElementKey.Change, selector, mode, value, ...(predicate === undefined ? {} : { predicate }) };
}

/**
 * Foundry's `ActiveEffectLike` as the typed element for what it sets: a skill, category or spellcasting rank
 * (`withSkillRaise`), or a number Pioneer derives (`withStatChange`). Any other leaves it for the backlog.
 */
export function withActiveEffect(raw: unknown): unknown {
  const raised = withSkillRaise(raw);
  return raised === raw ? withStatChange(raw) : raised;
}
