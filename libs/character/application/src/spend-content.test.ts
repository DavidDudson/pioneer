import { describe, expect, test } from 'bun:test';

import { SpendCount, SpendId, SpendKind, SpendProblem, SlotCountKey } from '@pioneer/character/domain';
import type { SpendRequest } from '@pioneer/character/domain';
import { ContentId, ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { newId } from '@pioneer/shared/kernel';

import { contentRefusal } from './spend-content';

const pack = new ContentPackBuilder()
  .withId('player-core')
  .withFeat('power-attack', { traits: ['attack', 'flourish'] })
  .withFeat('hide')
  .withSpell('fireball', { rank: 3, traditions: [], traits: [] })
  .withSpell('lay-on-hands', { rank: 1, traditions: [], traits: ['focus'] })
  .withSpell('light', { rank: 1, traditions: [], traits: ['cantrip'] })
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
    expect(contentRefusal(power, registry)).toBeUndefined();
  });

  test('an attack flag on an action without the attack trait is refused', () => {
    const hide = request(idOf(ContentKind.Feat, 'hide'), { attack: true });
    expect(contentRefusal(hide, registry)).toBe(SpendProblem.AttackNotAllowed);
  });

  test('an attack flag on a Strike, whose weapon has no attack trait, is allowed', () => {
    const strike = request(idOf(ContentKind.Weapon, 'longsword'), { attack: true });
    expect(contentRefusal(strike, registry)).toBeUndefined();
  });

  test('an attack flag on an id the content does not have is allowed', () => {
    const unknown = request(ContentId.parse(newId()), { attack: true });
    expect(contentRefusal(unknown, registry)).toBeUndefined();
  });

  test('an action without the attack flag is allowed whatever its traits', () => {
    const power = request(idOf(ContentKind.Feat, 'power-attack'));
    expect(contentRefusal(power, registry)).toBeUndefined();
  });

  test('a slot for a slotted spell and a Focus Point for a focus spell are allowed', () => {
    const slotted = request(idOf(ContentKind.Spell, 'fireball'), { slot: SLOT });
    const focused = request(idOf(ContentKind.Spell, 'lay-on-hands'), { focus: true });
    expect(contentRefusal(slotted, registry)).toBeUndefined();
    expect(contentRefusal(focused, registry)).toBeUndefined();
  });

  test('a Focus Point for a spell without the focus trait is refused', () => {
    const fireball = request(idOf(ContentKind.Spell, 'fireball'), { focus: true });
    expect(contentRefusal(fireball, registry)).toBe(SpendProblem.PaymentNotAllowed);
  });

  test('a slot for a focus spell or a cantrip is refused', () => {
    const focused = request(idOf(ContentKind.Spell, 'lay-on-hands'), { slot: SLOT });
    const cantrip = request(idOf(ContentKind.Spell, 'light'), { slot: SLOT });
    expect(contentRefusal(focused, registry)).toBe(SpendProblem.PaymentNotAllowed);
    expect(contentRefusal(cantrip, registry)).toBe(SpendProblem.PaymentNotAllowed);
  });

  test('a slot or a Focus Point on an action that is not a spell is not checked', () => {
    const hide = request(idOf(ContentKind.Feat, 'hide'), { focus: true });
    expect(contentRefusal(hide, registry)).toBeUndefined();
  });
});
