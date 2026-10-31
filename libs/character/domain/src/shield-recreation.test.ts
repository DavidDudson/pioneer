import { describe, expect, test } from 'bun:test';

import { ContentId, Hardness, HitPoints, SpellRank } from '@pioneer/rules/sdk';

import { ActiveSpellId } from './active-spell-id';
import { SpellSpendKind } from './active-spells';
import type { ActiveSpell } from './active-spells';
import { ActiveEffectSchema, EffectInstanceId, EffectRounds } from './effects';
import { InventoryItemId } from './inventory';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import type { PlayCommand, PlayState } from './play-state';
import type { ShieldContent, ShieldStats } from './shield-commands';
import { actions, OWN_TURN, playIn, Serial, spendOf } from './spend-log-testing';
import { TEST_SPEND, within } from './testing';
import { untypedDamage } from './untyped-damage';

const MAX = HitPoints.parse(30);
const ITEM = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const EFFECT = ContentId.parse('00000000-0000-4000-8000-0000000000e1');
const SPELL = ContentId.parse('00000000-0000-4000-8000-0000000000f1');
const CAST = ActiveSpellId.parse('00000000-0000-4000-8000-000000000001');
const OTHER_CAST = ActiveSpellId.parse('00000000-0000-4000-8000-000000000002');
const FIRST = Serial.parse(1);

/** A bone shield: 1 Hit Point and no Broken Threshold, recreated when the spell that cast it is sustained. */
function bone(recreatedOnSustain: boolean): ShieldContent {
  const stats: ShieldStats = {
    hardness: Hardness.parse(3),
    hitPoints: HitPoints.parse(1),
    brokenThreshold: HitPoints.parse(0),
    granted: {
      effect: EFFECT,
      endsOnBlock: false,
      endsWhenDestroyed: false,
      raised: true,
      layered: false,
      recreatedOnSustain,
    },
  };
  return new Map([[ITEM, stats]]);
}

function active(id: ActiveSpellId, sustainedThisTurn: boolean): ActiveSpell {
  return {
    id,
    spell: SPELL,
    rank: SpellRank.parse(1),
    remaining: EffectRounds.parse(10),
    sustainedThisTurn,
  };
}

/** The shield's effect, applied from `spell` when there is one. */
function playWith(spell: ActiveSpellId | undefined, sustainedThisTurn = false): PlayState {
  return {
    ...playIn(OWN_TURN),
    activeSpells: [active(CAST, sustainedThisTurn), active(OTHER_CAST, sustainedThisTurn)],
    effects: [
      ActiveEffectSchema.parse({
        id: EffectInstanceId.parse('00000000-0000-4000-8000-0000000000a1'),
        effect: EFFECT,
        ...(spell === undefined ? {} : { spell }),
      }),
    ],
  };
}

function apply(play: PlayState, command: PlayCommand, shields: ShieldContent): PlayState {
  return applyPlayCommand(play, command, { ...within(MAX), shields, spend: TEST_SPEND });
}

function block(play: PlayState, shields: ShieldContent): PlayState {
  const damage = untypedDamage(HitPoints.parse(12));
  return apply(play, { field: PlayCommandField.BlockWithShield, item: ITEM, damage }, shields);
}

function sustain(play: PlayState, id: ActiveSpellId, shields: ShieldContent): PlayState {
  const command = {
    ...spendOf(FIRST, actions(1)),
    action: SPELL,
    spell: { kind: SpellSpendKind.Sustain, id },
  };
  return apply(play, command, shields);
}

describe('a destroyed shield that its spell recreates', () => {
  test('stays destroyed, with its damage at its Hit Points, and is refused another block', () => {
    const destroyed = block(playWith(CAST), bone(true));

    expect(destroyed.shields).toStrictEqual({ [ITEM]: HitPoints.parse(1) });
    expect(block(destroyed, bone(true))).toStrictEqual(destroyed);
  });

  test('is whole again once the spell that cast it is sustained', () => {
    const destroyed = block(playWith(CAST), bone(true));
    const after = sustain(destroyed, CAST, bone(true));

    expect(after.shields).toStrictEqual({});
    expect(after.activeSpells.find(({ id }) => id === CAST)?.sustainedThisTurn).toBe(true);
  });

  test('stays destroyed when another spell is sustained', () => {
    const destroyed = block(playWith(CAST), bone(true));

    expect(sustain(destroyed, OTHER_CAST, bone(true)).shields).toStrictEqual(destroyed.shields);
  });

  test('stays destroyed when the sustain is refused because the spell was sustained this turn', () => {
    const destroyed = block(playWith(CAST, true), bone(true));

    expect(sustain(destroyed, CAST, bone(true)).shields).toStrictEqual(destroyed.shields);
  });
});

describe('a destroyed shield with nothing to recreate it', () => {
  test('is whole again at once when its effect was not applied from a spell', () => {
    expect(block(playWith(undefined), bone(true)).shields).toStrictEqual({});
  });

  test('is whole again at once when its grant is not recreated on Sustain', () => {
    expect(block(playWith(CAST), bone(false)).shields).toStrictEqual({});
  });

  test('is not touched by a sustain from a state with no shields', () => {
    expect(sustain(playWith(CAST), CAST, bone(true)).shields).toStrictEqual(FRESH_PLAY.shields);
  });
});
