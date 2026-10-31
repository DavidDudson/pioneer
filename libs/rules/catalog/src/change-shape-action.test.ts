import { describe, expect, test } from 'bun:test';

import { evaluatePredicate, PredicateFacts, Truth } from '@pioneer/rules/predicate';
import { ContentEntryFile, ContentKind, RollOption, spellEffectId } from '@pioneer/rules/sdk';
import type { Predicate, SpellEffectEntry } from '@pioneer/rules/sdk';

import { coreNamespaces } from './testing/fighter';

const WEREFORM = 'effect:effect-change-shape-werecreature';

/** The offer the action makes of the werecreature effect: the effect, and the predicate that offers it. */
interface Offer {
  readonly predicate: Predicate;
  readonly listed: boolean;
}

/** What Change Shape, the action Werecreature Dedication grants, lists for the werecreature effect. */
async function offerOfWerecreatureForm(): Promise<Offer> {
  const actionFile = await import('@pioneer/content/packs/mwangi-expanse/action.json');
  const effectFile = await import('@pioneer/content/packs/howl-of-the-wild/effect.json');
  const actions = ContentEntryFile.parse(actionFile.default);
  const effects = ContentEntryFile.parse(effectFile.default);
  const action = actions.find((entry) => entry.kind === ContentKind.Action && entry.slug === 'action:change-shape');
  const were = effects.find((entry) => entry.slug === WEREFORM);
  const listed: readonly SpellEffectEntry[] = action?.kind === ContentKind.Action ? (action.data.effects ?? []) : [];
  const entry = listed.find((each) => spellEffectId(each) === were?.id);
  return { listed: entry !== undefined, predicate: typeof entry === 'object' ? entry.predicate : [] };
}

/** Whether `predicate` holds for a character with exactly the roll options `options`. */
function holds(predicate: Predicate, options: readonly string[]): Truth {
  const facts = new PredicateFacts(
    options.map((option) => RollOption.parse(option)),
    coreNamespaces(),
  );
  return evaluatePredicate(predicate, facts);
}

describe('Change Shape, the action Werecreature Dedication grants', () => {
  test('lists the werecreature effect', async () => {
    const offer = await offerOfWerecreatureForm();
    expect(offer.listed).toBe(true);
  });

  test('offers it to a character with the dedication', async () => {
    const { predicate } = await offerOfWerecreatureForm();
    expect(holds(predicate, ['feat:werecreature-dedication'])).toBe(Truth.True);
  });

  test('does not offer it to a character without the dedication', async () => {
    const { predicate } = await offerOfWerecreatureForm();
    expect(holds(predicate, [])).not.toBe(Truth.True);
  });
});
