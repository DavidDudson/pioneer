import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterCommand, CompanionArchiveReason, CompanionName, FamiliarForm } from '@pioneer/character/domain';
import type { AddCompanionBody, Character, CharacterCompanions, Companion } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { CompanionKind, ContentId, SlotKey } from '@pioneer/rules/sdk';
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
const COMPANION_SLOT = SlotKey.parse('animal-companion:0');
const WOLF = ContentId.parse(newId());
const ASH = CompanionName.parse('Ash');
const BIRCH = CompanionName.parse('Birch');
const CEDAR = CompanionName.parse('Cedar');
const DUNE = CompanionName.parse('Dune');
const ELM = CompanionName.parse('Elm');

/** The companion called `name`; a test that expects one fails loudly when it is missing. */
function called(view: CharacterCompanions, name: CompanionName): Companion {
  const found = view.companions.find((each) => each.name === name);

  if (found === undefined) {
    throw new Error(`No companion called ${name}`);
  }

  return found;
}

/** The names of the companions that are live. */
function liveNames(view: CharacterCompanions): ReadonlyArray<CompanionName> {
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
      form: FamiliarForm.parse({}),
      grantedBy: FAMILIAR_SLOT,
      expectedVersion: character.version,
    };
  }

  /** An animal companion called `name`, read at the character's current version. */
  function wolf(name: CompanionName): AddCompanionBody {
    return {
      kind: CompanionKind.AnimalCompanion,
      name,
      form: { species: WOLF },
      grantedBy: COMPANION_SLOT,
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

  test('an animal companion keeps its species, and a familiar can live beside it', async () => {
    await service.add(amiri, character.id, familiar(PIP));
    const view = await service.add(amiri, character.id, wolf(MOTH));
    const moth = called(view, MOTH);
    expect(moth.kind).toBe(CompanionKind.AnimalCompanion);
    expect(moth.form).toStrictEqual({ species: WOLF });
    expect(liveNames(view)).toHaveLength(2);
  });

  test('a character holds up to four live animal companions, and a fifth is refused', async () => {
    await Promise.all([ASH, BIRCH, CEDAR, DUNE].map(async (name) => service.add(amiri, character.id, wolf(name))));
    const refused = await rejection(service.add(amiri, character.id, wolf(ELM)));
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('restoring an animal companion is refused while four are live', async () => {
    const ash = called(await service.add(amiri, character.id, wolf(ASH)), ASH);
    const ref = { character: character.id, companion: ash.id };
    await service.archive(amiri, ref, archival(CompanionArchiveReason.Replaced));
    await Promise.all([BIRCH, CEDAR, DUNE, ELM].map(async (name) => service.add(amiri, character.id, wolf(name))));
    const refused = await rejection(service.restore(amiri, ref, { expectedVersion: character.version }));
    expect(refused).toBeInstanceOf(ConflictError);
  });

  test('another user’s character reads as missing, whatever is asked of it', async () => {
    const pip = called(await service.add(amiri, character.id, familiar(PIP)), PIP);
    const ref = { character: character.id, companion: pip.id };
    const moth = familiar(MOTH);
    const released = archival(CompanionArchiveReason.Released);
    const unarchived = { expectedVersion: character.version };

    const refusals = await Promise.all([
      rejection(service.list(ezren, character.id)),
      rejection(service.add(ezren, character.id, moth)),
      rejection(service.archive(ezren, ref, released)),
      rejection(service.restore(ezren, ref, unarchived)),
    ]);

    for (const refused of refusals) {
      expect(refused).toBeInstanceOf(NotFoundError);
    }
  });
});
