import { HitPoints } from '@pioneer/rules/sdk';

import { applyEffectCommand, EffectCommandField } from './effect-commands';
import type { EffectCommand } from './effect-commands';
import type { ActiveEffect, EffectContent, EffectInstanceId } from './effects';

const NONE = HitPoints.parse(0);

/** The part of a play state ending or applying an effect reads and writes: the effects, and the temporary Hit Points. */
export interface EffectPlay {
  readonly effects: readonly ActiveEffect[];
  readonly hp: { readonly damage: HitPoints; readonly temp: HitPoints };
}

/**
 * `play` without the effects `ended`, and without the temporary Hit Points they gave. Temporary Hit Points do not
 * stack, so what is left is the form's own only while it is no more than what the form raised them to; more than that
 * came from another source and stays.
 */
export function endEffects<Play extends EffectPlay>(play: Play, ended: readonly EffectInstanceId[]): Play {
  const going = play.effects.filter(({ id }) => ended.includes(id));
  const given = HitPoints.parse(Math.max(NONE, ...going.map(({ tempHp }) => tempHp ?? NONE)));
  const temp = play.hp.temp <= given ? NONE : play.hp.temp;
  return { ...play, effects: play.effects.filter(({ id }) => !ended.includes(id)), hp: { ...play.hp, temp } };
}

/** The ids of the polymorph effects among `effects`, the ones a newer polymorph effect replaces. */
function polymorphs(effects: readonly ActiveEffect[], content: EffectContent): readonly EffectInstanceId[] {
  return effects.filter(({ effect }) => content.get(effect)?.polymorph === true).map(({ id }) => id);
}

/** `play` after an effect edit. Removing an effect gives back its temporary Hit Points; applying a polymorph effect ends the one before it. */
export function applyEffectEdit<Play extends EffectPlay>(
  play: Play,
  command: EffectCommand,
  content: EffectContent,
): Play {
  if (command.field === EffectCommandField.RemoveEffect) {
    return endEffects(play, [command.id]);
  }
  if (command.field !== EffectCommandField.ApplyEffect) {
    return { ...play, effects: [...applyEffectCommand(play.effects, command, content)] };
  }
  const terms = content.get(command.effect);
  const present = play.effects.some(({ id }) => id === command.id);
  if (terms === undefined || present) {
    return play;
  }
  const cleared = terms.polymorph === true ? endEffects(play, polymorphs(play.effects, content)) : play;
  const given = command.tempHp ?? NONE;
  const raised = given > cleared.hp.temp ? given : NONE;
  return {
    ...cleared,
    effects: [...applyEffectCommand(cleared.effects, { ...command, tempHp: raised }, content)],
    hp: { ...cleared.hp, temp: HitPoints.parse(Math.max(cleared.hp.temp, given)) },
  };
}
