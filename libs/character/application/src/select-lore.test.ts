import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterName, CharacterPatchField, LoreName } from '@pioneer/character/domain';
import type { CharacterId, CharacterPatch, PatchCharacterBody } from '@pioneer/character/domain';
import {
  humanAncestryId,
  playerCoreClasses,
  playerCoreClassId,
  skillFixtures,
} from '@pioneer/character/domain/testing';
import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');
const FIRST = SlotKey.parse('skill-training:1:0');
const SECOND = SlotKey.parse('skill-training:1:1');
const SAILING = ChoiceValue.parse('lore:sailing');

function selectLore(slot: SlotKey, name: string, version: Version): PatchCharacterBody {
  const patch: CharacterPatch = {
    field: CharacterPatchField.SelectSlot,
    slot,
    selection: SAILING,
    loreName: LoreName.parse(name),
  };
  return { expectedVersion: version, patch };
}

describe('CharacterService selecting a custom Lore', () => {
  let service: CharacterService;
  let id: CharacterId;

  beforeEach(async () => {
    service = new CharacterService(
      new InMemoryCharacterRepository(),
      fixedContent(playerCoreClasses(), skillFixtures()),
      clock,
    );
    const created = await service.create(amiri, {
      name: CharacterName.parse('Kyra'),
      ancestry: humanAncestryId,
    });
    ({ id } = created);
    const pickClass: PatchCharacterBody = {
      expectedVersion: created.version,
      patch: {
        field: CharacterPatchField.SelectSlot,
        slot: SlotKey.parse('class'),
        selection: ChoiceValue.parse(playerCoreClassId('fighter')),
      },
    };
    await service.patch(amiri, id, pickClass);
  });

  async function versionNow(): Promise<Version> {
    const character = await service.get(amiri, id);
    return character.version;
  }

  test('keeps the pick, and the name the player gave it, on the character', async () => {
    const { character } = await service.patch(amiri, id, selectLore(FIRST, 'Sailing Lore', await versionNow()));
    expect(character.document.build.choices[FIRST]).toBe(SAILING);
    expect(Object.values(character.document.build.lores).map(String)).toStrictEqual(['Sailing Lore']);
  });

  test('refuses the same topic typed another way: it is trained already', async () => {
    await service.patch(amiri, id, selectLore(FIRST, 'Sailing', await versionNow()));
    const again = selectLore(SECOND, 'sailing lore', await versionNow());
    const error = await rejection(service.patch(amiri, id, again));
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues[0]?.message.key).toBe('character.validation.skillTrained');
  });
});
