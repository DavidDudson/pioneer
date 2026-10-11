import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterName, CharacterPatchField } from '@pioneer/character/domain';
import type { CharacterPatch, PatchCharacterBody } from '@pioneer/character/domain';
import { humanAncestryId, spellFixtureId, spellFixtures } from '@pioneer/character/domain/testing';
import { ContentId } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-12T10:00:00Z');

function at(expectedVersion: Version, patch: CharacterPatch): PatchCharacterBody {
  return { expectedVersion, patch };
}

describe('CharacterService spell access', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const ancestries = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(ancestries, spellFixtures()), clock);
  });

  test('grants access to an uncommon spell once, and revokes it, each audited by name', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const veil = spellFixtureId('veil-of-privacy');
    const grant = { field: CharacterPatchField.GrantSpellAccess, spell: veil } as const;
    const { character: granted } = await service.patch(amiri, created.id, at(FIRST_VERSION, grant));
    const { character: again } = await service.patch(amiri, created.id, at(granted.version, grant));
    expect(again.document.build.spellAccess).toStrictEqual([veil]);

    const revoke = { field: CharacterPatchField.RevokeSpellAccess, spell: veil } as const;
    const { character: revoked } = await service.patch(amiri, created.id, at(again.version, revoke));
    expect(revoked.document.build.spellAccess).toStrictEqual([]);
    expect(repository.audits.map((audit) => audit.command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.GrantSpellAccess,
      CharacterCommand.GrantSpellAccess,
      CharacterCommand.RevokeSpellAccess,
    ]);
  });

  test.each([
    ['a common spell', spellFixtureId('fireball'), 'character.validation.spellAccessCommon'],
    ['a focus spell', spellFixtureId('force-bolt'), 'character.validation.unknownSpell'],
    ['an id no spell has', ContentId.parse(humanAncestryId), 'character.validation.unknownSpell'],
  ])('refuses access to %s, saving nothing', async (_case, spell, key) => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const edit = at(FIRST_VERSION, { field: CharacterPatchField.GrantSpellAccess, spell });
    const error = await rejection(service.patch(amiri, created.id, edit));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([{ path: ['patch', 'spell'], message: { key } }]);
    const unchanged = await service.get(amiri, created.id);
    expect(unchanged.version).toBe(FIRST_VERSION);
  });
});
