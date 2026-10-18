import {
  ACTIVE_SPELLS_MAX,
  activeSpellOf,
  canSustain,
  SpellSpendKind,
  withoutSpell,
  withSustained,
} from './active-spells';
import type { ActiveSpell } from './active-spells';
import { SpendCount, SpendKind, SpendProblem } from './spend-log';
import type { SpendCost, SpendEntry, SpendRequest } from './spend-log';

const ONE_ACTION = SpendCount.parse(1);

/** The part of a play state a spell spend reads and writes. */
export interface SpellPlay {
  readonly activeSpells: readonly ActiveSpell[];
}

/** Whether `cost` is exactly one action, which Sustain and the Dismiss action take. */
function oneAction(cost: SpendCost): boolean {
  return cost.kind === SpendKind.Actions && cost.count === ONE_ACTION;
}

/** Why the spell `active` can't be sustained now, or undefined when it can. */
function sustainProblem(active: ActiveSpell): SpendProblem | undefined {
  if (active.sustainedThisTurn) {
    return SpendProblem.AlreadySustained;
  }
  return canSustain(active) ? undefined : SpendProblem.SustainLimit;
}

/**
 * Why the change `request` makes to the active spells is refused, or undefined when it is allowed: a cast needs room for
 * one more and an id not yet used; a sustain or dismissal needs an active spell, and one action; a spell can be
 * sustained once a turn and only while it has rounds left.
 */
export function spellRefusal({ activeSpells }: SpellPlay, { cost, spell }: SpendRequest): SpendProblem | undefined {
  if (spell === undefined) {
    return undefined;
  }
  if (spell.kind === SpellSpendKind.Cast) {
    const taken = activeSpellOf(activeSpells, spell.id) !== undefined;
    return taken || activeSpells.length >= ACTIVE_SPELLS_MAX ? SpendProblem.TooManySpells : undefined;
  }
  const active = activeSpellOf(activeSpells, spell.id);
  if (active === undefined) {
    return SpendProblem.NoSuchSpell;
  }
  if (!oneAction(cost)) {
    return SpendProblem.CostNotAllowed;
  }
  return spell.kind === SpellSpendKind.Sustain ? sustainProblem(active) : undefined;
}

/** The active spells after a spend, and the spell a dismissal removed. */
export interface SpellChange {
  readonly activeSpells: readonly ActiveSpell[];
  readonly dismissed?: ActiveSpell;
}

/** `play`'s active spells after the spend `request`: the spell cast is added, the spell sustained is marked, the spell dismissed is gone. */
export function spellSpent({ activeSpells }: SpellPlay, { action, spell }: SpendRequest): SpellChange {
  if (spell === undefined) {
    return { activeSpells };
  }
  if (spell.kind === SpellSpendKind.Cast) {
    const cast: ActiveSpell = {
      id: spell.id,
      spell: action,
      rank: spell.rank,
      remaining: spell.rounds,
      sustainedThisTurn: true,
    };
    return { activeSpells: [...activeSpells, cast] };
  }
  if (spell.kind === SpellSpendKind.Sustain) {
    return { activeSpells: withSustained(activeSpells, spell.id, true) };
  }
  const dismissed = activeSpellOf(activeSpells, spell.id);
  return {
    activeSpells: withoutSpell(activeSpells, spell.id),
    ...(dismissed === undefined ? {} : { dismissed }),
  };
}

/** `play`'s active spells after the spend `entry` is taken back: the cast spell is gone, the sustain is off, the dismissed spell is back. */
export function spellUndone({ activeSpells }: SpellPlay, { spell, dismissed }: SpendEntry): readonly ActiveSpell[] {
  if (spell === undefined) {
    return activeSpells;
  }
  if (spell.kind === SpellSpendKind.Cast) {
    return withoutSpell(activeSpells, spell.id);
  }
  if (spell.kind === SpellSpendKind.Sustain) {
    return withSustained(activeSpells, spell.id, false);
  }
  return dismissed === undefined ? activeSpells : [...activeSpells, dismissed];
}
