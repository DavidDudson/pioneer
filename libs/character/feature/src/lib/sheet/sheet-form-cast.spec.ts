import { EffectInstanceId } from '@pioneer/character/domain';
import { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionCost, ContentId, ContentKind, ContentRegistry, RollOption, SpellRank } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import type { ActionUse, UsePayment } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { formCastOf } from './sheet-form-cast';
import type { FormCaster } from './sheet-form-cast';

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
  .withEffect('ape-form', 2)
  .withEffect('plant-form', 5);
const apeId = effects.idOf(ContentKind.Effect, 'ape-form');
const bearId = effects.idOf(ContentKind.Effect, 'bear-form');
const plantId = effects.idOf(ContentKind.Effect, 'plant-form');

const pack = effects
  .withSpell('animal-form', { rank: 2, traditions: ['primal'], effects: [bearId, apeId] })
  .withSpell('untamed-form', {
    rank: 1,
    traditions: [],
    effects: [apeId, { effect: plantId, predicate: ['feat:plant-shape'] }],
  })
  .withSpell('untamed-shift', { rank: 1, traditions: [], effects: [apeId], shiftsForm: true })
  .withSpell('fireball', { rank: 3, traditions: ['arcane'] });
const registry = new ContentRegistry();
registry.register(pack.build());

/** A use of the spell `name`, paying `payment` when it has one. */
function useOf(name: string, payment?: UsePayment): ActionUse {
  const id = ContentId.parse(pack.idOf(ContentKind.Spell, name));
  return { line: { id, name, cost: ActionCost.Two, payment }, actions: undefined };
}

/** A caster with `options` as roll options, a focus rank of 3. */
function casterWith(...options: string[]): FormCaster {
  return {
    facts: new PredicateFacts(
      options.map((option) => RollOption.parse(option)),
      new Map(),
    ),
    focusRank: SpellRank.parse(3),
    form: undefined,
  };
}

/** The labels of the forms Untamed Form offers `caster`. */
function untamedLabels(caster: FormCaster | undefined): readonly string[] | undefined {
  return formCastOf(registry, useOf('untamed-form'), caster)?.choices.map(({ label }) => label);
}

describe(formCastOf, () => {
  it('offers every form of every effect the spell lists, by the effect and the choice within it', () => {
    const cast = formCastOf(registry, useOf('animal-form'), undefined);
    expect(cast?.choices.map(({ label }) => label)).toStrictEqual([
      'Ape-form',
      'Bear-form: Grizzly',
      'Bear-form: Polar',
    ]);
    expect(cast?.choices.map(({ effect }) => effect)).toStrictEqual([apeId, bearId, bearId]);
    expect(cast?.choices.map(({ form }) => form)).toStrictEqual([undefined, 'bear-form:grizzly', 'bear-form:polar']);
  });

  it('is cast at the rank of the slot, else the spell’s own', () => {
    expect(formCastOf(registry, useOf('animal-form', { slot: 'druid:4' }), undefined)?.rank).toBe(4);
    expect(formCastOf(registry, useOf('animal-form'), undefined)?.rank).toBe(2);
  });

  it('offers a gated effect only to a caster whose roll options satisfy its predicate', () => {
    expect(untamedLabels(casterWith('feat:plant-shape'))).toStrictEqual(['Ape-form', 'Plant-form']);
    expect(untamedLabels(casterWith('feat:soaring-shape'))).toStrictEqual(['Ape-form']);
    expect(untamedLabels(undefined)).toStrictEqual(['Ape-form']);
  });

  it('is cast at the caster’s focus rank when it pays a Focus Point', () => {
    const cast = formCastOf(registry, useOf('untamed-form', { focus: true }), casterWith());
    expect(cast?.rank).toBe(3);
    expect(formCastOf(registry, useOf('untamed-form', { slot: 'druid:2' }), casterWith())?.rank).toBe(2);
  });

  it('shifts the form the caster is in when the spell shifts forms, and puts one on otherwise', () => {
    const form = EffectInstanceId.parse('11111111-1111-4111-8111-111111111111');
    const caster = { ...casterWith(), form };
    expect(formCastOf(registry, useOf('untamed-shift'), caster)?.shift).toBe(form);
    expect(formCastOf(registry, useOf('untamed-form'), caster)?.shift).toBeUndefined();
    expect(formCastOf(registry, useOf('untamed-shift'), casterWith())?.shift).toBeUndefined();
  });

  it('is no form cast for a spell that lists no effects', () => {
    expect(formCastOf(registry, useOf('fireball'), undefined)).toBeUndefined();
  });

  it('is no form cast for something that is no spell', () => {
    const action: ActionUse = {
      line: { id: ContentId.parse(apeId), name: 'Strike', cost: ActionCost.One },
      actions: undefined,
    };
    expect(formCastOf(registry, action, undefined)).toBeUndefined();
  });
});
