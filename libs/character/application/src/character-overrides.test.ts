import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  OverrideAuthorName,
  OverrideInput,
  PatchCharacterBody,
} from '@pioneer/character/domain';
import type { CharacterPatch } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { ValidationError, Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryOverrideAuthorDirectory } from './in-memory-override-author-directory';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-12T10:00:00Z');

const SHIELD = OverrideInput.parse({ target: 'ac', mode: 'adjust', value: 2, type: 'item', reason: 'Shield spell' });
const ADD: CharacterPatch = { field: CharacterPatchField.AddOverride, override: SHIELD };

function at(expectedVersion: Version, patch: object): PatchCharacterBody {
  return PatchCharacterBody.parse({ expectedVersion, patch });
}

describe('CharacterService overrides', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const ancestries = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(ancestries), clock);
  });

  test('adds an override under the actor, edits it, then removes it, each audited by name', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const { character: added } = await service.patch(amiri, created.id, at(FIRST_VERSION, ADD));
    const [override] = added.document.overrides;
    expect(override).toMatchObject({ target: 'ac', value: 2, reason: 'Shield spell', by: amiri });

    const id = override?.id;
    const edit = { field: CharacterPatchField.EditOverride, id, override: { ...SHIELD, value: 3 } };
    const { character: edited } = await service.patch(amiri, created.id, at(added.version, edit));
    expect(edited.document.overrides[0]).toMatchObject({ value: 3 });
    expect(edited.document.overrides[0]?.revisions).toHaveLength(1);

    const remove = { field: CharacterPatchField.RemoveOverride, id, reason: 'Spell ended' };
    const { character: removed } = await service.patch(amiri, created.id, at(edited.version, remove));
    expect(removed.document.overrides[0]?.removed).toMatchObject({ by: amiri, reason: 'Spell ended' });
    expect(repository.audits.map((audit) => audit.command)).toStrictEqual([
      CharacterCommand.CreateCharacter,
      CharacterCommand.AddOverride,
      CharacterCommand.EditOverride,
      CharacterCommand.RemoveOverride,
    ]);
  });

  test('refuses an edit of an override the character does not have, before anything is written', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const remove = { field: CharacterPatchField.RemoveOverride, id: newId(), reason: 'Nothing to remove' };
    const error = await rejection(service.patch(amiri, created.id, at(FIRST_VERSION, remove)));

    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['patch'], message: { key: 'character.validation.overrideUnknown' } },
    ]);
    expect(repository.audits).toHaveLength(1);
  });

  test('refuses an override with no reason at the request body, by message key', () => {
    const body = { expectedVersion: FIRST_VERSION, patch: { ...ADD, override: { ...SHIELD, reason: '  ' } } };
    const result = PatchCharacterBody.safeParse(body);

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain('character.validation.overrideReasonRequired');
  });
});
describe('CharacterService sheet authors', () => {
  const ancestries = new ContentPackBuilder().withId('player-core').withAncestry('human').build();

  test('names the users who authored the overrides, and leaves out a character with none', async () => {
    const directory = new InMemoryOverrideAuthorDirectory().name(amiri, 'Amiri');
    const service = new CharacterService(new InMemoryCharacterRepository(), fixedContent(ancestries), clock);
    service.withAuthors(directory);
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const plain = await service.sheet(created);
    const { character } = await service.patch(amiri, created.id, at(FIRST_VERSION, ADD));
    const adjusted = await service.sheet(character);

    expect(plain.authors).toBeUndefined();
    expect(adjusted.authors).toStrictEqual([{ userId: amiri, displayName: OverrideAuthorName.parse('Amiri') }]);
  });
});
