import { describe, expect, test } from 'bun:test';

import { isCountingCommand } from './counting-commands';
import { Doomed } from './death-track';
import { needsConditionContent, needsMaxHitPoints, needsResourceMaxima, needsRestContent } from './play-needs';
import { PlayCommandField } from './play-state';
import type { PlayCommand } from './play-state';
import { Resource, ResourceCount } from './resources';

const REST: PlayCommand = { field: PlayCommandField.Rest };
const DAILY_PREPARATIONS: PlayCommand = { field: PlayCommandField.DailyPreparations };
const REFOCUS: PlayCommand = { field: PlayCommandField.Refocus };
const START_SESSION: PlayCommand = { field: PlayCommandField.StartSession };
const SET_DOOMED: PlayCommand = { field: PlayCommandField.SetDoomed, doomed: Doomed.parse(1) };
const SPEND_HERO_POINT: PlayCommand = {
  field: PlayCommandField.SpendResource,
  resource: Resource.HeroPoints,
  amount: ResourceCount.parse(1),
};

describe('the content a play command needs', () => {
  test.each([
    ['rest', REST, true],
    ['daily preparations', DAILY_PREPARATIONS, false],
    ['refocus', REFOCUS, false],
    ['start of session', START_SESSION, false],
    ['setting doomed', SET_DOOMED, false],
  ])('%s needs the maximum Hit Points: %p', (_name, command, expected) => {
    expect(needsMaxHitPoints(command)).toBe(expected);
  });

  test.each([
    ['rest', REST, true],
    ['daily preparations', DAILY_PREPARATIONS, true],
    ['refocus', REFOCUS, true],
    ['start of session', START_SESSION, true],
    ['spending a hero point', SPEND_HERO_POINT, true],
    ['setting doomed', SET_DOOMED, false],
  ])('%s needs the resource maxima: %p', (_name, command, expected) => {
    expect(needsResourceMaxima(command)).toBe(expected);
  });

  test.each([
    ['rest', REST],
    ['daily preparations', DAILY_PREPARATIONS],
    ['refocus', REFOCUS],
    ['start of session', START_SESSION],
  ])('%s needs no condition content', (_name, command) => {
    expect(needsConditionContent(command)).toBe(false);
  });

  test.each([
    ['rest', REST, true],
    ['daily preparations', DAILY_PREPARATIONS, false],
    ['refocus', REFOCUS, false],
    ['start of session', START_SESSION, false],
    ['setting doomed', SET_DOOMED, false],
  ])('%s needs the healing and recovery content: %p', (_name, command, expected) => {
    expect(needsRestContent(command)).toBe(expected);
  });
});

describe('isCountingCommand', () => {
  test.each([
    ['rest', REST, true],
    ['daily preparations', DAILY_PREPARATIONS, true],
    ['refocus', REFOCUS, true],
    ['start of session', START_SESSION, true],
    ['spending a hero point', SPEND_HERO_POINT, true],
    ['setting doomed', SET_DOOMED, false],
  ])('%s: %p', (_name, command, expected) => {
    expect(isCountingCommand(command)).toBe(expected);
  });
});
