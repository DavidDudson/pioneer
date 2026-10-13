import { TestBed } from '@angular/core/testing';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, playerCoreClassId } from '@pioneer/character/domain/testing';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { beforeAll, describe, expect, it } from 'vitest';

import { CHARACTER_CONTENT_KINDS } from '../data/content-registry-query';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../testing/provide-server-state-testing';
import { sheetPlannedBoosts } from './sheet-attributes';
import { sheetPlannedSkillSlots } from './sheet-skills';

function fighterAt(level: number): Character {
  return new CharacterBuilder().atLevel(level).picking('class', playerCoreClassId('fighter')).build();
}

async function registry(): Promise<ContentRegistry> {
  TestBed.configureTestingModule({ providers: provideServerStateTesting() });
  return TestBed.inject(ContentLoader).registry(CHARACTER_CONTENT_KINDS);
}

describe('planned slots', () => {
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('plans the skill slots above the level only, each with a key and the skills it offers', async () => {
    const slots = sheetPlannedSkillSlots(await registry(), fighterAt(3));

    const keys = slots.map((slot) => slot.key);
    expect(keys).toContain('skill-increase:5');
    expect(keys).not.toContain('skill-increase:3');
    expect(slots.every((slot) => slot.options.length > 0)).toBe(true);
  });

  it('plans the boost slots above the level only, numbering the four boosts of a level', async () => {
    const boosts = sheetPlannedBoosts(await registry(), fighterAt(4));

    const atFive = boosts.filter((boost) => boost.key.startsWith('boost:5:free:'));
    expect(atFive.map((boost) => boost.label)).toStrictEqual(
      [1, 2, 3, 4].map((number) => ({
        key: 'rules.attributes.boost.freeNumbered',
        params: { level: 5, number },
      })),
    );
    expect(boosts.some((boost) => boost.key.startsWith('boost:1:'))).toBe(false);
  });
});
