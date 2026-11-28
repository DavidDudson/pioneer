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

  /** `held()` with a project to `NEW` on `FEAT` that has `daysDone` of its 7 days worked. */
  async function retraining(daysDone: number): Promise<Character> {
    const base = await held();
    const started = base.apply({ field: CharacterPatchField.StartRetraining, slot: FEAT, to: NEW }, clock.now());

    const worked =
      daysDone === 0
        ? started
        : started.apply({ field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(daysDone) }, clock.now());

    return repository.update(worked, base.version, { actor: owner, command: CharacterCommand.StartRetraining });
  }

  /** The reasons the service refuses `patch` for `character` with. */
  async function refusalFor(character: Character, patch: CharacterPatch): Promise<ReadonlyArray<string>> {
    const error = await rejection(service.patch(owner, character.id, { expectedVersion: character.version, patch }));

    if (!(error instanceof ValidationError)) {
      throw new TypeError('expected the patch to be refused with a ValidationError');
    }

    return error.issues.map((issue) => issue.message.key);
  }

  async function refusal(patch: CharacterPatch): Promise<ReadonlyArray<string>> {
    return refusalFor(await held(), patch);
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

  test('refuses a second project', async () => {
    const started = await retraining(0);
    const patch = { field: CharacterPatchField.StartRetraining, slot: FEAT, to: ChoiceValue.parse('other-feat') };

    expect(await refusalFor(started, patch)).toEqual(['character.validation.retrainingBusy']);
  });

  test('refuses the last day when the slot no longer offers the replacement', async () => {
    const almost = await retraining(6);
    const patch = { field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(1) };

    expect(await refusalFor(almost, patch)).toEqual(['character.validation.slotNotOpen']);
  });

  test('treats more days than are left as the last day', async () => {
    const started = await retraining(0);
    const patch = { field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(30) };

    expect(await refusalFor(started, patch)).toEqual(['character.validation.slotNotOpen']);
  });

  test('lets a day that is not the last through without asking the slot', async () => {
    const started = await retraining(2);
    const patch = { field: CharacterPatchField.WorkRetraining, days: RetrainDays.parse(1) };

    const { character: worked } = await service.patch(owner, started.id, { expectedVersion: started.version, patch });

    expect(Number(worked.document.build.retraining?.daysDone)).toBe(3);
  });

  test.each([
    { field: CharacterPatchField.SelectSlot, slot: FEAT, selection: ChoiceValue.parse('third-feat') },
    { field: CharacterPatchField.ClearSlot, slot: FEAT },
  ])('refuses a slot edit on the slot being retrained: $field', async (patch) => {
    const started = await retraining(0);

    expect(await refusalFor(started, patch)).toEqual(['character.validation.retrainingSlotBusy']);
  });
});
