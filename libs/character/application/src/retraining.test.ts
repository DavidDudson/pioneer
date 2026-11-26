import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CharacterPatchField, RetrainDays } from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import { CharacterBuilder, humanAncestryId } from '@pioneer/character/domain/testing';
import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const clock = fixedClock('2026-10-07T10:00:00Z');
const FEAT = SlotKey.parse('feat:class:2');
const BOOST = SlotKey.parse('boost:1:ancestry:0');
const NEW = ChoiceValue.parse('new-feat');

describe('CharacterService retraining', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;
  const owner = UserId.parse(newId());

  beforeEach(() => {
    const pack = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, fixedContent(pack), clock);
  });

  /** A character of `owner` holding a feat in `FEAT` and a boost, at its first version. */
  async function held(): Promise<Character> {
    const built = new CharacterBuilder()
      .ownedBy(owner)
      .named('Kyra')
      .withAncestry(humanAncestryId)
      .picking(FEAT, 'old-feat')
      .picking(BOOST, 'str')
      .build();

    return repository.insert(built, { actor: owner, command: CharacterCommand.CreateCharacter });
  }

  /** The reasons the service refuses `patch` with. */
  async function refusal(patch: CharacterPatch): Promise<readonly string[]> {
    const character = await held();
    const error = await rejection(service.patch(owner, character.id, { expectedVersion: character.version, patch }));

    expect(error).toBeInstanceOf(ValidationError);

    // SAFETY: the call under test rejects with a ValidationError for this patch.
    return (error as ValidationError).issues.map((issue) => issue.message.key);
  }

  test('refuses a pick that can not be retrained', async () => {
    const patch = { field: CharacterPatchField.StartRetraining, slot: BOOST, to: ChoiceValue.parse('dex') };

    expect(await refusal(patch)).toEqual(['character.validation.retrainingNotAllowed']);
  });

  test('refuses a slot with nothing held', async () => {
    const patch = {
      field: CharacterPatchField.StartRetraining,
      slot: SlotKey.parse('feat:class:4'),
      to: NEW,
    };

    expect(await refusal(patch)).toEqual(['character.validation.retrainingNotAllowed']);
  });

  test('refuses the pick already held', async () => {
    const patch = { field: CharacterPatchField.StartRetraining, slot: FEAT, to: ChoiceValue.parse('old-feat') };

    expect(await refusal(patch)).toEqual(['character.validation.retrainingSame']);
  });

  test('refuses a replacement for a slot the content no longer opens', async () => {
    const patch = { field: CharacterPatchField.StartRetraining, slot: FEAT, to: NEW };

    expect(await refusal(patch)).toEqual(['character.validation.slotNotOpen']);
  });

  test('refuses work when nothing is being retrained', async () => {
    const patch = { field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(1) };

    expect(await refusal(patch)).toEqual(['character.validation.retrainingNone']);
  });

  test('leaves the character at its version when an edit is refused', async () => {
    const character = await held();

    await refusal({ field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(1) });

    const stored = await service.get(owner, character.id);

    expect(stored.version).toBe(FIRST_VERSION);
  });
});
