import { describe, expect, test } from 'bun:test';

import {
  ActiveSpellId,
  EffectInstanceId,
  EffectRounds,
  SpellSpendKind,
  SpendCount,
  SpendId,
  SpendKind,
  SpendProblem,
  SlotCountKey,
} from '@pioneer/character/domain';
import type { ActiveSpell, SpendRequest } from '@pioneer/character/domain';
import { ContentId, ContentKind, ContentRegistry, SpellRank } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { newId } from '@pioneer/shared/kernel';

import { contentRefusal } from './spend-content';

const effects = new ContentPackBuilder().withId('player-core').withEffect('ape-form', 2).withEffect('bear-form', 2);
const APE = ContentId.parse(effects.idOf(ContentKind.Effect, 'ape-form'));
const BEAR = ContentId.parse(effects.idOf(ContentKind.Effect, 'bear-form'));

const pack = effects
  .withFeat('power-attack', { traits: ['attack', 'flourish'] })
  .withFeat('hide')
  .withSpell('fireball', { rank: 3, traditions: [], traits: [] })
  .withSpell('lay-on-hands', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('light', { rank: 1, traditions: [], traits: ['cantrip'] })
  .withSpell('barrier', { rank: 2, traditions: [], duration: { type: 'sustained' } })
  .withSpell('timed', {
    rank: 2,
    traditions: [],
    duration: { type: 'time', count: 1, unit: 'minute', sustained: true },
  })
  .withSpell('shift', { rank: 1, traditions: [], effects: [APE], shiftsForm: true })
  .withSpell('morph', { rank: 1, traditions: [], effects: [APE] })
  .withSpell('mirror', { rank: 2, traditions: [], duration: { type: 'sustained' }, dismiss: true })
  .withItem(ContentKind.Weapon, 'longsword', {
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  });
const registry = new ContentRegistry();
registry.register(pack.build());

const SLOT = SlotCountKey.parse('wizard:3');
const NO_SPELLS = { activeSpells: [] };
const TEN_MINUTES = EffectRounds.parse(100);
const ONE_MINUTE = EffectRounds.parse(10);
const ACTIVE = ActiveSpellId.parse(newId());
const EFFECT = EffectInstanceId.parse(newId());

/** The id of the entry of `kind` the pack gave `name`. */
function idOf(kind: ContentKind, name: string): ContentId {
  const entry = registry.packs.flatMap((each) => each.otherEntries).find((each) => each.slug === `${kind}:${name}`);
  if (entry === undefined) {
    throw new Error(`no ${kind} named ${name}`);
  }
  return entry.id;
}

function request(action: ContentId, extra: Partial<SpendRequest> = {}): SpendRequest {
  return {
    id: SpendId.parse(newId()),
    action,
    cost: { kind: SpendKind.Actions, count: SpendCount.parse(1) },
    ...extra,
  };
}

describe('contentRefusal', () => {
  test('an attack flag on an action with the attack trait is allowed', () => {
    const power = request(idOf(ContentKind.Feat, 'power-attack'), { attack: true });
    expect(contentRefusal(power, registry, NO_SPELLS)).toBeUndefined();
  });

  test('an attack flag on an action without the attack trait is refused', () => {
    const hide = request(idOf(ContentKind.Feat, 'hide'), { attack: true });
    expect(contentRefusal(hide, registry, NO_SPELLS)).toBe(SpendProblem.AttackNotAllowed);
  });

  test('an attack flag on a Strike, whose weapon has no attack trait, is allowed', () => {
    const strike = request(idOf(ContentKind.Weapon, 'longsword'), { attack: true });
    expect(contentRefusal(strike, registry, NO_SPELLS)).toBeUndefined();
  });

  test('an attack flag on an id the content does not have is allowed', () => {
    const unknown = request(ContentId.parse(newId()), { attack: true });
    expect(contentRefusal(unknown, registry, NO_SPELLS)).toBeUndefined();
  });

  test('an action without the attack flag is allowed whatever its traits', () => {
    const power = request(idOf(ContentKind.Feat, 'power-attack'));
    expect(contentRefusal(power, registry, NO_SPELLS)).toBeUndefined();
  });

  test('a slot for a slotted spell and a Focus Point for a focus spell are allowed', () => {
    const slotted = request(idOf(ContentKind.Spell, 'fireball'), { slot: SLOT });
    const focused = request(idOf(ContentKind.Spell, 'lay-on-hands'), { focus: true });
    expect(contentRefusal(slotted, registry, NO_SPELLS)).toBeUndefined();
    expect(contentRefusal(focused, registry, NO_SPELLS)).toBeUndefined();
  });

  test('a Focus Point for a spell without the focus trait is refused', () => {
    const fireball = request(idOf(ContentKind.Spell, 'fireball'), { focus: true });
    expect(contentRefusal(fireball, registry, NO_SPELLS)).toBe(SpendProblem.PaymentNotAllowed);
  });

  test('a slot for a focus spell or a cantrip is refused', () => {
    const focused = request(idOf(ContentKind.Spell, 'lay-on-hands'), { slot: SLOT });
    const cantrip = request(idOf(ContentKind.Spell, 'light'), { slot: SLOT });
    expect(contentRefusal(focused, registry, NO_SPELLS)).toBe(SpendProblem.PaymentNotAllowed);
    expect(contentRefusal(cantrip, registry, NO_SPELLS)).toBe(SpendProblem.PaymentNotAllowed);
  });

  test('a slot or a Focus Point on an action that is not a spell is not checked', () => {
    const hide = request(idOf(ContentKind.Feat, 'hide'), { focus: true });
    expect(contentRefusal(hide, registry, NO_SPELLS)).toBeUndefined();
  });
});

function cast(action: ContentId, rounds: EffectRounds): SpendRequest {
  return request(action, { spell: { kind: SpellSpendKind.Cast, id: ACTIVE, rank: SpellRank.parse(2), rounds } });
}

interface Dismissal {
  readonly request: SpendRequest;
  readonly active: readonly ActiveSpell[];
}

function dismissing(spell: ContentId): Dismissal {
  const rank = SpellRank.parse(2);
  const active: ActiveSpell = { id: ACTIVE, spell, rank, remaining: TEN_MINUTES, sustainedThisTurn: false };
  return { request: request(spell, { spell: { kind: SpellSpendKind.Dismiss, id: ACTIVE } }), active: [active] };
}

describe('contentRefusal for sustained spells', () => {
  test('casting a sustained spell for as long as it lasts is allowed', () => {
    const barrier = cast(idOf(ContentKind.Spell, 'barrier'), TEN_MINUTES);
    const timed = cast(idOf(ContentKind.Spell, 'timed'), ONE_MINUTE);
    expect(contentRefusal(barrier, registry, NO_SPELLS)).toBeUndefined();
    expect(contentRefusal(timed, registry, NO_SPELLS)).toBeUndefined();
  });

  test('casting it for longer or shorter than its content says is refused', () => {
    const barrier = cast(idOf(ContentKind.Spell, 'barrier'), ONE_MINUTE);
    expect(contentRefusal(barrier, registry, NO_SPELLS)).toBe(SpendProblem.NotSustained);
  });

  test('casting a spell that is not sustained, or is no spell, as sustained is refused', () => {
    const fireball = cast(idOf(ContentKind.Spell, 'fireball'), TEN_MINUTES);
    const hide = cast(idOf(ContentKind.Feat, 'hide'), TEN_MINUTES);
    expect(contentRefusal(fireball, registry, NO_SPELLS)).toBe(SpendProblem.NotSustained);
    expect(contentRefusal(hide, registry, NO_SPELLS)).toBe(SpendProblem.NotSustained);
  });

  test('the Dismiss action is allowed for a spell whose content has it', () => {
    const { request: dismiss, active } = dismissing(idOf(ContentKind.Spell, 'mirror'));
    expect(contentRefusal(dismiss, registry, { activeSpells: active })).toBeUndefined();
  });

  test('the Dismiss action is refused for a spell whose content has none', () => {
    const { request: dismiss, active } = dismissing(idOf(ContentKind.Spell, 'barrier'));
    expect(contentRefusal(dismiss, registry, { activeSpells: active })).toBe(SpendProblem.DismissNotAllowed);
  });

  test('a form shift to a form the spell lists is allowed', () => {
    const shift = request(idOf(ContentKind.Spell, 'shift'), { shift: { effect: EFFECT, to: APE } });
    expect(contentRefusal(shift, registry, NO_SPELLS)).toBeUndefined();
  });

  test('a form shift to a form the spell does not list is refused', () => {
    const shift = request(idOf(ContentKind.Spell, 'shift'), { shift: { effect: EFFECT, to: BEAR } });
    expect(contentRefusal(shift, registry, NO_SPELLS)).toBe(SpendProblem.ShiftNotAllowed);
  });

  test('a form shift by a spell that does not shift forms, or by no spell, is refused', () => {
    const morph = request(idOf(ContentKind.Spell, 'morph'), { shift: { effect: EFFECT, to: APE } });
    const hide = request(idOf(ContentKind.Feat, 'hide'), { shift: { effect: EFFECT, to: APE } });
    expect(contentRefusal(morph, registry, NO_SPELLS)).toBe(SpendProblem.ShiftNotAllowed);
    expect(contentRefusal(hide, registry, NO_SPELLS)).toBe(SpendProblem.ShiftNotAllowed);
  });

  test('dismissing a spell that is not active is left to the play state to refuse', () => {
    const { request: dismiss } = dismissing(idOf(ContentKind.Spell, 'barrier'));
    expect(contentRefusal(dismiss, registry, NO_SPELLS)).toBeUndefined();
  });
});
