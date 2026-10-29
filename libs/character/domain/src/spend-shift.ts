import type { ActiveEffect } from './effects';
import { SpendProblem } from './spend-log';
import type { SpendEntry, SpendRequest } from './spend-log';

/** The part of a play state a form shift reads and writes. */
export interface ShiftPlay {
  readonly effects: readonly ActiveEffect[];
}

/** The active effects after a spend, and the effect a form shift changed, as it was. */
export interface ShiftChange {
  readonly effects: readonly ActiveEffect[];
  readonly shifted?: ActiveEffect;
}

/** `effect` with the form `form` and the temporary Hit Points `tempHp` set, or left off when there are none. */
function withForm(effect: ActiveEffect, to: Pick<ActiveEffect, 'effect' | 'form' | 'tempHp'>): ActiveEffect {
  const { form: _form, tempHp: _tempHp, ...kept } = effect;
  return {
    ...kept,
    effect: to.effect,
    ...(to.form === undefined ? {} : { form: to.form }),
    ...(to.tempHp === undefined ? {} : { tempHp: to.tempHp }),
  };
}

/** Why the form shift `request` makes is refused, or undefined when it is allowed: the effect it changes must be on the character. */
export function shiftRefusal({ effects }: ShiftPlay, { shift }: SpendRequest): SpendProblem | undefined {
  if (shift === undefined) {
    return undefined;
  }
  return effects.some(({ id }) => id === shift.effect) ? undefined : SpendProblem.NoSuchEffect;
}

/** `play`'s active effects after the spend `request`: the effect it shifts has the new form and keeps its time left. */
export function shiftSpent({ effects }: ShiftPlay, { shift }: SpendRequest): ShiftChange {
  const target = shift === undefined ? undefined : effects.find(({ id }) => id === shift.effect);
  if (shift === undefined || target === undefined) {
    return { effects };
  }
  return {
    effects: effects.map((each) =>
      each.id === shift.effect ? withForm(each, { effect: shift.to, form: shift.form, tempHp: shift.tempHp }) : each,
    ),
    shifted: target,
  };
}

/** Why taking back the spend `entry` is refused, or undefined when it is allowed: the effect it shifted must still be on the character. */
export function shiftUndoRefusal({ effects }: ShiftPlay, { shift, shifted }: SpendEntry): SpendProblem | undefined {
  if (shift === undefined || shifted === undefined) {
    return undefined;
  }
  return effects.some(({ id }) => id === shift.effect) ? undefined : SpendProblem.NoSuchEffect;
}

/** `play`'s active effects after the spend `entry` is taken back: the shifted effect has its old form, and the time it has left now. */
export function shiftUndone({ effects }: ShiftPlay, { shift, shifted }: SpendEntry): readonly ActiveEffect[] {
  if (shift === undefined || shifted === undefined) {
    return effects;
  }
  return effects.map((each) => (each.id === shift.effect ? withForm(each, shifted) : each));
}
