import { describe, expect, test } from 'bun:test';

import { CharacterBuilder, fixtureOwnerId } from '@pioneer/character/domain/testing';
import { newId, UserId } from '@pioneer/shared/kernel';

import { mayAccessCharacter } from './character-policy';

describe('mayAccessCharacter', () => {
  const character = new CharacterBuilder().ownedBy(fixtureOwnerId).build();

  test('the owner may', () => {
    expect(mayAccessCharacter(fixtureOwnerId, character)).toBe(true);
  });

  test('anyone else may not', () => {
    const stranger = UserId.parse(newId());
    expect(mayAccessCharacter(stranger, character)).toBe(false);
  });
});
