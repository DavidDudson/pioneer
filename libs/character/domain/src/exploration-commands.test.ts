import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { applyExplorationCommand, ExplorationCommandField, ExplorationCommandSchema } from './exploration-commands';
import { PlayEditSchema } from './play-state';

const DEFEND = ContentId.parse('00000000-0000-4000-8000-000000000001');

describe('applyExplorationCommand', () => {
  test('picks the activity', () => {
    expect(applyExplorationCommand({ field: ExplorationCommandField.SetExplorationActivity, activity: DEFEND })).toBe(
      DEFEND,
    );
  });

  test('leaving the activity out clears it', () => {
    expect(applyExplorationCommand({ field: ExplorationCommandField.SetExplorationActivity })).toBeUndefined();
  });
});

describe('the exploration edit', () => {
  test('parses with an id, and without one', () => {
    const field = ExplorationCommandField.SetExplorationActivity;
    expect(ExplorationCommandSchema.parse({ field, activity: DEFEND })).toStrictEqual({ field, activity: DEFEND });
    expect(ExplorationCommandSchema.parse({ field })).toStrictEqual({ field });
  });

  test('refuses an activity that is no id', () => {
    const field = ExplorationCommandField.SetExplorationActivity;
    expect(ExplorationCommandSchema.safeParse({ field, activity: 'defend' }).success).toBe(false);
  });

  test('is an edit the play endpoint takes', () => {
    const field = ExplorationCommandField.SetExplorationActivity;
    expect(PlayEditSchema.safeParse({ field, activity: DEFEND }).success).toBe(true);
  });
});
