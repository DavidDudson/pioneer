import { ActionCost, ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { ActionUse } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { formCastOf } from './sheet-form-cast';

const BEAR_CHOICES = {
  key: 'ChoiceSet',
  flag: 'bear-form',
  prompt: 'Select a form.',
  rollOption: 'bear-form',
  choices: [
    { value: 'grizzly', label: 'Grizzly' },
    { value: 'polar', label: 'Polar' },
  ],
};

const effects = new ContentPackBuilder()
  .withId('player-core')
  .withEffect('bear-form', 2, [BEAR_CHOICES])
  .withEffect('ape-form', 2);
const apeId = effects.idOf(ContentKind.Effect, 'ape-form');
const bearId = effects.idOf(ContentKind.Effect, 'bear-form');

const pack = effects
  .withSpell('animal-form', { rank: 2, traditions: ['primal'], effects: [bearId, apeId] })
  .withSpell('fireball', { rank: 3, traditions: ['arcane'] });
const registry = new ContentRegistry();
registry.register(pack.build());

/** A use of the spell `name`, paying `slot` when it names one. */
function useOf(name: string, slot?: string): ActionUse {
  const id = ContentId.parse(pack.idOf(ContentKind.Spell, name));
  const payment = slot === undefined ? undefined : { slot };
  return { line: { id, name, cost: ActionCost.Two, payment }, actions: undefined };
}

describe(formCastOf, () => {
  it('offers every form of every effect the spell lists, by the effect and the choice within it', () => {
    const cast = formCastOf(registry, useOf('animal-form'));
    expect(cast?.choices.map(({ label }) => label)).toStrictEqual([
      'Ape-form',
      'Bear-form: Grizzly',
      'Bear-form: Polar',
    ]);
    expect(cast?.choices.map(({ effect }) => effect)).toStrictEqual([apeId, bearId, bearId]);
    expect(cast?.choices.map(({ form }) => form)).toStrictEqual([undefined, 'bear-form:grizzly', 'bear-form:polar']);
  });

  it('is cast at the rank of the slot, else the spell’s own', () => {
    expect(formCastOf(registry, useOf('animal-form', 'druid:4'))?.rank).toBe(4);
    expect(formCastOf(registry, useOf('animal-form'))?.rank).toBe(2);
  });

  it('is no form cast for a spell that lists no effects', () => {
    expect(formCastOf(registry, useOf('fireball'))).toBeUndefined();
  });

  it('is no form cast for something that is no spell', () => {
    const action: ActionUse = {
      line: { id: ContentId.parse(apeId), name: 'Strike', cost: ActionCost.One },
      actions: undefined,
    };
    expect(formCastOf(registry, action)).toBeUndefined();
  });
});
