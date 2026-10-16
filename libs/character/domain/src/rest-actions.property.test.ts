import { describe, expect, test } from 'bun:test';

import {
  ConditionEffect,
  ConditionValue,
  ContentId,
  ContentKind,
  ContentRegistry,
  FocusPoints,
  HitPoints,
  Slug,
  SpellRank,
} from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { assert, boolean, constantFrom, integer, property, record } from 'fast-check';

import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';
import { abilityUseKey, Boundary, slotCountKey } from './counted-resources';
import type { CountedMaxima } from './counted-resources';
import { Doomed } from './death-track';
import { InventoryItemId } from './inventory';
import { FRESH_PLAY } from './play-state';
import type { PlayState } from './play-state';
import { Resource, ResourceCount, resourceMaxima } from './resources';
import { preparedDaily, refocused, rested, sessionStarted } from './rest-actions';
import { restRecovery } from './rest-limits';
import type { RestLimits, RestOutcome } from './rest-types';
import { NO_STAFF } from './staff-limits';

const MAX = 8;
const HIT_POINTS_MAX = 60;
const SLOT = slotCountKey(Slug.parse('wizard'), undefined, SpellRank.parse(1));
const DAILY = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000001'));
const SESSION = abilityUseKey(ContentId.parse('00000000-0000-4000-8000-000000000002'));

const COUNTED: CountedMaxima = {
  slots: new Map([[SLOT, { max: ResourceCount.parse(MAX), boundary: Boundary.Day }]]),
  uses: new Map([
    [DAILY, { max: ResourceCount.parse(MAX), boundary: Boundary.Day }],
    [SESSION, { max: ResourceCount.parse(MAX), boundary: Boundary.Session }],
  ]),
};

const LIMITS: RestLimits = {
  hitPoints: HitPoints.parse(HIT_POINTS_MAX),
  healing: HitPoints.parse(MAX),
  recovery: new Map(),
  resources: resourceMaxima(FocusPoints.parse(2)),
  counted: COUNTED,
  staff: NO_STAFF,
};

const spent = integer({ min: 0, max: MAX }).map((value) => ResourceCount.parse(value));

/** What a generated play state is built from. */
interface PlaySpec {
  readonly damage: number;
  readonly hero: number;
  readonly focus: number;
  readonly slot: ResourceCount;
  readonly daily: ResourceCount;
  readonly session: ResourceCount;
}

function playOf({ damage, hero, focus, slot, daily, session }: PlaySpec): PlayState {
  return {
    ...FRESH_PLAY,
    hp: { damage: HitPoints.parse(damage), temp: HitPoints.parse(0) },
    resources: {
      ...FRESH_PLAY.resources,
      [Resource.HeroPoints]: ResourceCount.parse(hero),
      [Resource.FocusPoints]: ResourceCount.parse(focus),
      slots: { [SLOT]: slot },
      uses: { [DAILY]: daily, [SESSION]: session },
    },
  };
}

const plays = record({
  damage: integer({ min: 0, max: HIT_POINTS_MAX }),
  hero: integer({ min: 0, max: 3 }),
  focus: integer({ min: 0, max: 2 }),
  slot: spent,
  daily: spent,
  session: spent,
}).map((spec): PlayState => playOf(spec));

const ACTIONS = [rested, preparedDaily, refocused, sessionStarted] as const;
const IDEMPOTENT = [preparedDaily, sessionStarted] as const;

type Action = (play: PlayState, limits: RestLimits) => RestOutcome<PlayState>;

describe('restoring actions', () => {
  test('keep Hit Points and every count within 0 and the maximum', () => {
    assert(
      property(plays, constantFrom(...ACTIONS), (play, action: Action) => {
        const after = action(play, LIMITS).play;
        expect(after.hp.damage).toBeLessThanOrEqual(HIT_POINTS_MAX);
        expect(after.hp.damage).toBeLessThanOrEqual(play.hp.damage);
        expect(after.resources[Resource.FocusPoints]).toBeLessThanOrEqual(2);
        expect(after.resources[Resource.HeroPoints]).toBeLessThanOrEqual(3);
        expect(after.resources.slots[SLOT] ?? 0).toBeLessThanOrEqual(play.resources.slots[SLOT] ?? 0);
      }),
    );
  });

  test('never spend a count they restore', () => {
    assert(
      property(plays, constantFrom(...ACTIONS), (play, action: Action) => {
        const after = action(play, LIMITS).play;
        for (const key of [DAILY, SESSION]) {
          expect(after.resources.uses[key] ?? 0).toBeLessThanOrEqual(play.resources.uses[key] ?? 0);
        }
      }),
    );
  });

  test('daily preparations and start of session applied twice leave what applying once does', () => {
    assert(
      property(plays, constantFrom(...IDEMPOTENT), (play, action: Action) => {
        const once = action(play, LIMITS);
        const twice = action(once.play, LIMITS);
        expect(twice.play).toEqual(once.play);
        expect(twice.changes).toEqual([]);
      }),
    );
  });

  test('give a staff charges of at most the highest spell rank plus the rank of the slot expended', () => {
    const staff = InventoryItemId.parse('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const ranks = integer({ min: 1, max: 10 }).map((rank) => SpellRank.parse(rank));
    assert(
      property(plays, ranks, ranks, (play, highest, slotRank) => {
        const key = slotCountKey(Slug.parse('wizard'), undefined, slotRank);
        const limits: RestLimits = {
          ...LIMITS,
          counted: { ...COUNTED, slots: new Map([[key, { max: ResourceCount.parse(MAX), boundary: Boundary.Day }]]) },
          staff: { staves: new Set([staff]), highestRank: highest, expendable: new Set([key]) },
        };
        const { play: after } = preparedDaily(play, limits, {
          staff,
          slot: { entry: Slug.parse('wizard'), rank: slotRank },
        });
        const charges = after.resources.staff[staff]?.max ?? 0;
        expect(charges).toBeLessThanOrEqual(highest + slotRank);
        expect(charges).toBeGreaterThanOrEqual(highest);
        expect(Object.keys(after.resources.staff)).toStrictEqual([staff]);
      }),
    );
  });
});

const CONDITIONS = new ContentPackBuilder()
  .withCondition('fatigued', [], { recovery: { rest: ConditionEffect.Remove } })
  .withCondition('drained', [], { valued: true, recovery: { rest: ConditionEffect.Lower } });
const REGISTRY = new ContentRegistry();
REGISTRY.register(CONDITIONS.build());
const FATIGUED = ContentId.parse(CONDITIONS.idOf(ContentKind.Condition, 'fatigued'));
const DRAINED = ContentId.parse(CONDITIONS.idOf(ContentKind.Condition, 'drained'));
const EASING: RestLimits = { ...LIMITS, recovery: restRecovery(REGISTRY) };

const DRAINED_MAX = 4;
const DOOMED_MAX = 2;
const FATIGUED_ID = ConditionInstanceId.parse('11111111-1111-4111-8111-111111111111');
const DRAINED_ID = ConditionInstanceId.parse('22222222-2222-4222-8222-222222222222');

function activeCondition(id: ConditionInstanceId, content: ContentId, value?: number): ActiveCondition {
  return {
    id,
    condition: content,
    ...(value === undefined ? {} : { value: ConditionValue.parse(value) }),
    duration: { kind: ConditionDurationKind.Unlimited },
  };
}

/** A play state that is doomed and drained, and fatigued when `fatigued`. */
function afflicted(doomed: number, drained: number, fatigued: boolean): PlayState {
  return {
    ...FRESH_PLAY,
    doomed: Doomed.parse(doomed),
    conditions: [
      ...(fatigued ? [activeCondition(FATIGUED_ID, FATIGUED)] : []),
      ...(drained === 0 ? [] : [activeCondition(DRAINED_ID, DRAINED, drained)]),
    ],
  };
}

const doomedValues = integer({ min: 0, max: DOOMED_MAX });
const drainedValues = integer({ min: 0, max: DRAINED_MAX });

function drainedOf(play: PlayState): number {
  return play.conditions.find(({ condition }) => condition === DRAINED)?.value ?? 0;
}

describe('rest easing conditions', () => {
  test('lowers doomed and drained to a floor of 0 and leaves no fatigued', () => {
    assert(
      property(doomedValues, drainedValues, boolean(), (doomed, drained, fatigued) => {
        const after = rested(afflicted(doomed, drained, fatigued), EASING).play;
        expect(after.doomed).toBe(Doomed.parse(Math.max(doomed - 1, 0)));
        expect(drainedOf(after)).toBe(Math.max(drained - 1, 0));
        expect(after.conditions.some(({ condition }) => condition === FATIGUED)).toBe(false);
      }),
    );
  });

  test('applied twice eases a second time, unlike daily preparations and start of session', () => {
    assert(
      property(integer({ min: 2, max: DRAINED_MAX }), (drained) => {
        const once = rested(afflicted(DOOMED_MAX, drained, true), EASING);
        const twice = rested(once.play, EASING);
        expect(drainedOf(twice.play)).toBe(drainedOf(once.play) - 1);
        expect(twice.play.doomed).toBeLessThan(once.play.doomed);
        expect(twice.changes).not.toEqual([]);
      }),
    );
  });

  test('refocus applied twice restores a second focus point, unlike daily preparations', () => {
    const spentOut: PlayState = playOf({
      damage: 0,
      hero: 0,
      focus: 2,
      slot: ResourceCount.parse(0),
      daily: ResourceCount.parse(0),
      session: ResourceCount.parse(0),
    });
    const once = refocused(spentOut, EASING);
    const twice = refocused(once.play, EASING);
    expect(twice.play.resources[Resource.FocusPoints]).toBe(
      ResourceCount.parse(once.play.resources[Resource.FocusPoints] - 1),
    );
    expect(twice.changes).not.toEqual([]);
  });
});
