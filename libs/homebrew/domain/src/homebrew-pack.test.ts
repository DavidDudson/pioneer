import { describe, expect, test } from 'bun:test';

import { PackVisibility } from '@pioneer/rules/sdk';
import { FIRST_VERSION } from '@pioneer/shared/kernel';

import { HomebrewPack } from './homebrew-pack';
import { HomebrewPackBuilder } from './testing';

describe('HomebrewPack', () => {
  test('a new pack is private, empty and at the first version', () => {
    const pack = new HomebrewPackBuilder().build();
    expect(pack.visibility).toBe(PackVisibility.Private);
    expect(pack.entryCount).toBe(0);
    expect(pack.version).toBe(FIRST_VERSION);
  });

  test('the codec round-trips through the wire', () => {
    const pack = new HomebrewPackBuilder().slug('ezren-spells').build();
    const wire = HomebrewPack.codec.encode(pack);
    expect(HomebrewPack.codec.decode(wire)).toStrictEqual(pack);
  });
});
