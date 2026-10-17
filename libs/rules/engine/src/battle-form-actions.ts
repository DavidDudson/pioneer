import { Trait } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, MessageParams, ValueOf } from '@pioneer/shared/kernel';

import type { FormInPlay } from './battle-form';
import { EngineMessage } from './messages';

/** The traits that say what an action needs of the body that does it. */
const SPEECH: ReadonlySet<Trait> = new Set([Trait.parse('auditory'), Trait.parse('linguistic')]);
const MANIPULATE = Trait.parse('manipulate');

/** An engine message key. */
type MessageKey = ValueOf<typeof EngineMessage>;

/** What an action is, for the restrictions a battle form puts on it. */
interface FormRestricted {
  /** The action's traits. */
  readonly traits: readonly Trait[];
  /** Whether it is casting a spell: the Cast a Spell action, or a spell. */
  readonly casts: boolean;
}

function reason(forbidden: boolean, key: MessageKey, params: MessageParams): readonly MessageDescriptor[] {
  return forbidden ? [message(key, params)] : [];
}

/**
 * Why the battle form in force makes an action unavailable, one reason for each thing the form forbids that the action
 * needs, naming the form (rules-engine.md, "Battle forms"): spells when it can't cast, auditory and linguistic actions
 * when it can't speak, manipulate actions when it has no hands. A flag the form leaves out forbids nothing.
 */
export function formBlockers(
  { traits, casts }: FormRestricted,
  form: FormInPlay | undefined,
): readonly MessageDescriptor[] {
  if (form === undefined) {
    return [];
  }
  const { canCast, canSpeak, hasHands } = form.form;
  const params = { form: form.origin.entry };
  const speaks = traits.some((trait) => SPEECH.has(trait));
  return [
    ...reason(canCast === false && casts, EngineMessage.ActionFormCantCast, params),
    ...reason(canSpeak === false && speaks, EngineMessage.ActionFormCantSpeak, params),
    ...reason(hasHands === false && traits.includes(MANIPULATE), EngineMessage.ActionFormNoHands, params),
  ];
}
