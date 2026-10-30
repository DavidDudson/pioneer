import { HitPoints } from '@pioneer/rules/sdk';

import { EffectCommandField } from './effect-commands';
import { applyEffectEdit, endEffects } from './effect-ending';
import type { EffectPlay } from './effect-ending';
import { SELF } from './effects';
import type { ActiveEffect, EffectContent } from './effects';
import { SpendProblem } from './spend-log';
import type { SpendEntry, SpendRequest } from './spend-log';

const NONE = HitPoints.parse(0);

/** The part of a play state a form shift reads and writes. */
export interface ShiftPlay {
  readonly effects: readonly ActiveEffect[];
  readonly hp: { readonly damage: HitPoints; readonly temp: HitPoints };
}

/** The active effects and temporary Hit Points after a form shift, and the effect it changed, as it was. */
export interface ShiftChange {
  readonly effects: readonly ActiveEffect[];
  readonly temp: HitPoints;
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

/** `play` with the form the spend `request` puts on the character applied, as the sheet's own apply-effect edit would: it ends the polymorph effect before it and raises the temporary Hit Points. */
export function formApplied<Play extends EffectPlay>(
  play: Play,
  { apply }: SpendRequest,
  content: EffectContent,
): Play {
  return apply === undefined
    ? play
    : applyEffectEdit(
        play,
        {
          field: EffectCommandField.ApplyEffect,
          id: apply.id,
          effect: apply.effect,
          source: SELF,
          rank: apply.rank,
          ...(apply.form === undefined ? {} : { form: apply.form }),
          ...(apply.tempHp === undefined ? {} : { tempHp: apply.tempHp }),
        },
        content,
      );
}

/** Why the form shift `request` makes is refused, or undefined when it is allowed: the effect it changes must be on the character. */
export function shiftRefusal({ effects }: ShiftPlay, { shift }: SpendRequest): SpendProblem | undefined {
  if (shift === undefined) {
    return undefined;
  }
  return effects.some(({ id }) => id === shift.effect) ? undefined : SpendProblem.NoSuchEffect;
}

/** The temporary Hit Points after a form shift, and what the new form raised them to. */
interface TempSwap {
  readonly temp: HitPoints;
  readonly raised: HitPoints;
}

/**
 * The temporary Hit Points after a form that raised them to `from` gives way to one that gives `to`, and what the new
 * form raised them to. Temporary Hit Points do not stack, so the old form's are only dropped while they are no more than
 * it raised them to, and the new form's count only when they are more than what is left.
 */
function swapped(temp: HitPoints, from: HitPoints, to: HitPoints): TempSwap {
  const kept = temp <= from ? NONE : temp;
  return { temp: HitPoints.parse(Math.max(kept, to)), raised: to > kept ? to : NONE };
}

/** `effect` with the form `to` and the temporary Hit Points it raised `raised`, which are left off when it raised none. */
function formed(effect: ActiveEffect, to: Pick<ActiveEffect, 'effect' | 'form'>, raised: HitPoints): ActiveEffect {
  return withForm(effect, { ...to, ...(raised > NONE ? { tempHp: raised } : {}) });
}

/** `play`'s active effects and temporary Hit Points after the spend `request`: the effect it shifts has the new form and keeps its time left. */
export function shiftSpent({ effects, hp }: ShiftPlay, { shift }: SpendRequest): ShiftChange {
  const target = shift === undefined ? undefined : effects.find(({ id }) => id === shift.effect);
  if (shift === undefined || target === undefined) {
    return { effects, temp: hp.temp };
  }
  const { temp, raised } = swapped(hp.temp, target.tempHp ?? NONE, shift.tempHp ?? NONE);
  return {
    effects: effects.map((each) =>
      each.id === shift.effect ? formed(each, { effect: shift.to, form: shift.form }, raised) : each,
    ),
    temp,
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

/** `play`'s active effects and temporary Hit Points after the spend `entry` is taken back: the shifted effect has its old form, and the time it has left now, or the form the spend put on the character, and the temporary Hit Points it gave, is gone (and stays gone when it already ended). */
export function shiftUndone(
  play: ShiftPlay,
  { shift, shifted, apply }: SpendEntry,
): Pick<ShiftChange, 'effects' | 'temp'> {
  if (apply !== undefined) {
    const ended = endEffects(play, [apply.id]);
    return { effects: ended.effects, temp: ended.hp.temp };
  }
  const { effects, hp } = play;
  const target = shift === undefined ? undefined : effects.find(({ id }) => id === shift.effect);
  if (shift === undefined || shifted === undefined || target === undefined) {
    return { effects, temp: hp.temp };
  }
  const { temp, raised } = swapped(hp.temp, target.tempHp ?? NONE, shifted.tempHp ?? NONE);
  return { effects: effects.map((each) => (each.id === shift.effect ? formed(each, shifted, raised) : each)), temp };
}
