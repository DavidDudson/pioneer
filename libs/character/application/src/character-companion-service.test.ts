import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CompanionArchiveReason, CompanionForm, CompanionName } from '@pioneer/character/domain';
import type { AddCompanionBody, Character, CharacterCompanions, Companion } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { CompanionKind, SlotKey } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterCompanionService } from './character-companion-service';
import { InMemoryCharacterCompanionRepository } from './in-memory-character-companion-repository';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const FAMILIAR_SLOT = SlotKey.parse('witch-lesson:0');
const PIP = CompanionName.parse('Pip');
const MOTH = CompanionName.parse('Moth');

/** The companion called `name`; a test that expects one fails loudly when it is missing. */
function called(view: CharacterCompanions, name: CompanionName): Companion {
  const found = view.companions.find((each) => each.name === name);
  if (found === undefined) {
    throw new Error(`No companion called ${name}`);
  }
  return found;
}

/** The names of the companions that are live. */
function liveNames(view: CharacterCompanions): readonly CompanionName[] {
  return view.companions.filter((each) => each.archived === undefined).map((each) => each.name);
}

/** The reason to archive a companion, and the character version the owner read. */
interface ArchiveRequest {
  readonly reason: CompanionArchiveReason;
  readonly expectedVersion: Character['version'];
}

describe('the companions a character owns', () => {
  let service: CharacterCompanionService;
  let character: Character;

  /** A familiar called `name`, read at the character's current version. */
  function familiar(name: CompanionName): AddCompanionBody {
    return {
      kind: CompanionKind.Familiar,
      name,
      form: CompanionForm.parse({}),
      grantedBy: FAMILIAR_SLOT,
      expectedVersion: character.version,
    };
  }

  /** The version the owner read, with a reason to archive. */
  function archival(reason: CompanionArchiveReason): ArchiveRequest {
    return { reason, expectedVersion: character.version };
  }

  beforeEach(async () => {
    const characters = new InMemoryCharacterRepository();
    service = new CharacterCompanionService(
      { characters, companions: new InMemoryCharacterCompanionRepository() },
      fixedClock('2026-11-15T10:00:00Z'),
    );
    character = await characters.insert(new CharacterBuilder().named('Kyra').ownedBy(amiri).build(), {
      actor: amiri,
      command: CharacterCommand.CreateCharacter,
    });
  });

  test('a character without a familiar has no companions', async () => {
    expect(await service.list(amiri, character.id)).toStrictEqual({ companions: [] });
  });

  test('a character with a familiar lists exactly that one, live', async () => {
    const view = await service.add(amiri, character.id, familiar(PIP));
    expect(liveNames(view)).toStrictEqual([PIP]);
    expect(view.companions).toHaveLength(1);
  });

  test('a second live familiar is refused', async () => {
    await service.add(amiri, character.id, familiar(PIP));
    const refused = await rejection(service.add(amiri, character.id, familiar(MOTH)));
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('archiving keeps the row, and frees the place for a new familiar', async () => {
    const pip = called(await service.add(amiri, character.id, familiar(PIP)), PIP);
    const ref = { character: character.id, companion: pip.id };
    await service.archive(amiri, ref, archival(CompanionArchiveReason.Replaced));
    const view = await service.add(amiri, character.id, familiar(MOTH));
    expect(liveNames(view)).toStrictEqual([MOTH]);
    expect(called(view, PIP).archived?.reason).toBe(CompanionArchiveReason.Replaced);
  });

  test('restoring is refused while another live familiar holds the place', async () => {
    const pip = called(await service.add(amiri, character.id, familiar(PIP)), PIP);
    const ref = { character: character.id, companion: pip.id };
    await service.archive(amiri, ref, archival(CompanionArchiveReason.Released));
    await service.add(amiri, character.id, familiar(MOTH));
    const refused = await rejection(service.restore(amiri, ref, { expectedVersion: character.version }));
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('restoring works once the place is free again', async () => {
    const pip = called(await service.add(amiri, character.id, familiar(PIP)), PIP);
    const ref = { character: character.id, companion: pip.id };
    await service.archive(amiri, ref, archival(CompanionArchiveReason.Released));
    const view = await service.restore(amiri, ref, { expectedVersion: character.version });
    expect(liveNames(view)).toStrictEqual([PIP]);
  });

  test('another user’s character reads as missing', async () => {
    const listed = await rejection(service.list(ezren, character.id));
    const added = await rejection(service.add(ezren, character.id, familiar(PIP)));
    expect(listed).toBeInstanceOf(NotFoundError);
    expect(added).toBeInstanceOf(NotFoundError);
  });
});
