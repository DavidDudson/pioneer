import { describe, expect, test } from 'bun:test';

import { ContentId, HitPoints, OriginHopKind } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { PLAY_COMMANDS } from './character-command';
import {
  ActiveEnvironmentsSchema,
  applyEnvironmentCommand,
  ENVIRONMENTS_MAX,
  EnvironmentCommandField,
  environmentContent,
  environmentRoots,
  isEnvironmentCommand,
  restrictionsInPlay,
} from './environments';
import type { EnvironmentCommand } from './environments';
import { equippedRules } from './equipped';
import { applyPlayCommand, FRESH_PLAY, PlayCommandField } from './play-state';
import { slotContent } from './slot-offer';
import { CharacterBuilder, itemFixtureContent, itemFixtureRegistry, underwaterFixtureId, within } from './testing';

installRulesFakes();

const DARK = ContentId.parse('00000000-0000-4000-8000-0000000000d1');
const COLD = ContentId.parse('00000000-0000-4000-8000-0000000000d2');

const idAt = (index: number): ContentId =>
  ContentId.parse(`00000000-0000-4000-8000-${String(index + 100).padStart(12, '0')}`);

const set = (environment: ContentId, active: boolean): EnvironmentCommand => ({
  field: EnvironmentCommandField.SetEnvironment,
  environment,
  active,
});

describe('applyEnvironmentCommand', () => {
  test('turning an environment on lists it, in the order turned on', () => {
    const after = applyEnvironmentCommand(applyEnvironmentCommand([], set(DARK, true)), set(COLD, true));

    expect(after).toEqual([DARK, COLD]);
  });

  test('turning on an environment already on changes nothing', () => {
    expect(applyEnvironmentCommand([DARK, COLD], set(DARK, true))).toEqual([DARK, COLD]);
  });

  test('turning an environment off takes it out and keeps the rest', () => {
    expect(applyEnvironmentCommand([DARK, COLD], set(DARK, false))).toEqual([COLD]);
  });

  test('turning off an environment that is not on changes nothing', () => {
    expect(applyEnvironmentCommand([COLD], set(DARK, false))).toEqual([COLD]);
  });

  test('a character is in only so many environments', () => {
    const full = Array.from({ length: ENVIRONMENTS_MAX }, (_unused, index) => idAt(index));
    const first = idAt(0);

    expect(applyEnvironmentCommand(full, set(DARK, true))).toEqual(full);
    expect(applyEnvironmentCommand(full, set(first, false))).toHaveLength(ENVIRONMENTS_MAX - 1);
  });
});

describe('environment commands in play', () => {
  test('a play state starts in no environment', () => {
    expect(FRESH_PLAY.environments).toEqual([]);
    expect(ActiveEnvironmentsSchema.parse(undefined)).toEqual([]);
  });

  test('the play edit is told apart and audited by name', () => {
    const command = set(DARK, true);

    expect(isEnvironmentCommand(command)).toBe(true);
    expect(isEnvironmentCommand({ field: PlayCommandField.SetToggle })).toBe(false);
    expect(PLAY_COMMANDS[command.field]).toBe('setEnvironment');
  });

  test('the edit reaches the play state', () => {
    const play = applyPlayCommand(FRESH_PLAY, set(DARK, true), {
      ...within(HitPoints.parse(10)),
      effects: new Map(),
    });

    expect(play.environments).toEqual([DARK]);
  });
});

describe('environmentRoots', () => {
  test('each environment is a root behind an environment hop', () => {
    expect(environmentRoots([DARK])).toEqual([
      { entry: DARK, hop: { kind: OriginHopKind.Environment, environment: DARK } },
    ]);
  });
});

describe('restrictionsInPlay', () => {
  const registry = itemFixtureRegistry();
  const content = environmentContent(registry);
  const underwater = underwaterFixtureId();

  test('lists what each environment the character is in forbids, with its id and reason', () => {
    expect(restrictionsInPlay([underwater], content)).toEqual([
      { environment: underwater, id: 'speech', reason: "You can't speak underwater." },
    ]);
  });

  test('lists nothing for a character in no environment, or in one the content lacks', () => {
    expect(restrictionsInPlay([], content)).toEqual([]);
    expect(restrictionsInPlay([DARK], content)).toEqual([]);
  });
});

describe('equippedRules with an environment', () => {
  const content = itemFixtureContent();
  const slots = slotContent(itemFixtureRegistry());
  const underwater = underwaterFixtureId();
  const dry = new CharacterBuilder().build().document;
  const wet = { ...dry, play: { ...dry.play, environments: [underwater] } };

  test('the rules of an environment the character is in are in play, behind its environment hop', () => {
    const { rules } = equippedRules(wet, content, slots);

    expect(rules).toHaveLength(1);
    expect(rules[0]?.origin.hops[0]).toEqual({ kind: OriginHopKind.Environment, environment: underwater });
  });

  test('a character in no environment has none of its rules', () => {
    expect(equippedRules(dry, content, slots).rules).toHaveLength(0);
  });
});
