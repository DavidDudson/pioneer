import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterCommand,
  CharacterName,
  CharacterPatchField,
  Doomed,
  Dying,
  FRESH_PLAY,
  InventoryItemId,
  PlayCommandField,
  Resource,
  ResourceCount,
  SlotCountKey,
  untypedDamage,
  Wounded,
} from '@pioneer/character/domain';
import type { Character, PlayCommand } from '@pioneer/character/domain';
import { HUMAN_HIT_POINTS, hitPointsContent, humanAncestryId } from '@pioneer/character/domain/testing';
import { DegreeOfSuccess, HitPoints, Slug, SpellRank } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import {
  fixedClock,
  FIRST_VERSION,
  newId,
  nextVersion,
  NotFoundError,
  UserId,
  ValidationError,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { PlayService } from './play-service';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const clock = fixedClock('2026-10-13T10:00:00Z');

function damage(amount: number): PlayCommand {
  return {
    field: PlayCommandField.Damage,
    damage: untypedDamage(HitPoints.parse(amount)),
  };
}

describe('PlayService', () => {
  let repository: InMemoryCharacterRepository;
  let characters: CharacterService;
  let play: PlayService;
  let kyra: Character;

  beforeEach(async () => {
    const content = fixedContent(hitPointsContent());
    repository = new InMemoryCharacterRepository();
    characters = new CharacterService(repository, content, clock);
    play = new PlayService(repository, content, clock);
    kyra = await characters.create(amiri, { name: CharacterName.parse('Kyra'), ancestry: humanAncestryId });
  });

  test('a new character starts at full Hit Points, at the first revision', async () => {
    expect(await play.get(amiri, kyra.id)).toStrictEqual({ revision: FIRST_VERSION, play: FRESH_PLAY });
  });

  test('a play edit bumps the play revision only, and lands in the audit log by name', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(3) });
    expect(saved.revision).toBe(nextVersion(FIRST_VERSION));
    expect(saved.play.hp.damage).toBe(HitPoints.parse(3));
    const character = await characters.get(amiri, kyra.id);
    expect(character.version).toBe(kyra.version);
    expect(character.document.play).toStrictEqual(saved.play);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.Damage);
  });

  test('Hit Points are held to the maximum the engine derives', async () => {
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(50) });
    expect(saved.play.hp.damage).toBe(HUMAN_HIT_POINTS);
  });

  test('rest heals by the Constitution modifier and level the build gives, and is audited as rest', async () => {
    const hurt = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(5) });
    const rested = await play.patch(amiri, kyra.id, {
      expectedRevision: hurt.revision,
      command: { field: PlayCommandField.Rest },
    });
    expect(rested.play.hp.damage).toBeLessThan(hurt.play.hp.damage);
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.Rest);
  });

  test('start of session sets hero points to 1 in one edit', async () => {
    const started = await play.patch(amiri, kyra.id, {
      expectedRevision: FIRST_VERSION,
      command: { field: PlayCommandField.StartSession },
    });
    expect(started.play.resources[Resource.HeroPoints]).toBe(ResourceCount.parse(2));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.StartSession);
  });

  test('a build save leaves play state alone', async () => {
    await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(2) });
    const renamed = await characters.patch(amiri, kyra.id, {
      expectedVersion: kyra.version,
      patch: { field: CharacterPatchField.Name, value: CharacterName.parse('Kyra of Sarenrae') },
    });
    expect(renamed.character.document.play.hp.damage).toBe(HitPoints.parse(2));
    const after = await play.get(amiri, kyra.id);
    expect(after.revision).toBe(nextVersion(FIRST_VERSION));
  });

  test('a stale revision is a conflict, and nothing is written', async () => {
    await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(1) });
    const stale = rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(4) }));
    expect(await stale).toBeInstanceOf(VersionConflictError);
    const kept = await play.get(amiri, kyra.id);
    expect(kept.play.hp.damage).toBe(HitPoints.parse(1));
  });

  test('a character whose maximum Hit Points cannot be derived yet is refused', async () => {
    const bare = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const service = new PlayService(repository, bare, clock);
    const refused = rejection(service.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(1) }));
    expect(await refused).toBeInstanceOf(ValidationError);
  });

  test('a character with no maximum yet can still gain temporary Hit Points', async () => {
    const bare = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const service = new PlayService(repository, bare, clock);
    const command: PlayCommand = { field: PlayCommandField.SetTempHp, temp: HitPoints.parse(4) };
    const saved = await service.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command });
    expect(saved.play.hp.temp).toBe(HitPoints.parse(4));
  });

  test('dropping to 0 Hit Points starts dying, and a recovery check at the next revision eases it', async () => {
    const down = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(50) });
    expect(down.play.dying).toBe(Dying.parse(1));
    const command: PlayCommand = { field: PlayCommandField.RecoveryCheck, degree: DegreeOfSuccess.Success };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: down.revision, command });
    expect(saved.play.dying).toBe(Dying.parse(0));
    expect(saved.play.wounded).toBe(Wounded.parse(1));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.RecoveryCheck);
  });

  test('a character with no maximum yet can still be given doomed', async () => {
    const bare = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    const service = new PlayService(repository, bare, clock);
    const command: PlayCommand = { field: PlayCommandField.SetDoomed, doomed: Doomed.parse(1) };
    const saved = await service.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command });
    expect(saved.play.doomed).toBe(Doomed.parse(1));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SetDoomed);
  });

  test('hero points are spent at the next revision, held to 3, and audited by name', async () => {
    const spend: PlayCommand = {
      field: PlayCommandField.SpendResource,
      resource: Resource.HeroPoints,
      amount: ResourceCount.parse(1),
    };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: spend });
    expect(saved.play.resources[Resource.HeroPoints]).toBe(ResourceCount.parse(1));
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SpendResource);
    const regain: PlayCommand = { ...spend, field: PlayCommandField.RegainResource, amount: ResourceCount.parse(9) };
    const full = await play.patch(amiri, kyra.id, { expectedRevision: saved.revision, command: regain });
    expect(full.play.resources[Resource.HeroPoints]).toBe(ResourceCount.parse(0));
  });

  test('a character with no focus spells has no focus points to spend', async () => {
    const spend: PlayCommand = {
      field: PlayCommandField.SpendResource,
      resource: Resource.FocusPoints,
      amount: ResourceCount.parse(1),
    };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: spend });
    expect(saved.play.resources[Resource.FocusPoints]).toBe(ResourceCount.parse(0));
  });

  test('a slot the build does not give is left alone, and the edit lands in the audit log by name', async () => {
    const spend: PlayCommand = { field: PlayCommandField.SpendSlot, slot: SlotCountKey.parse('wizard:1') };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: spend });
    expect(saved.play.resources.slots).toStrictEqual({});
    expect(repository.audits.at(-1)?.command).toBe(CharacterCommand.SpendSlot);
  });

  test('spending every hero point while dying stabilises, with no maximum Hit Points needed', async () => {
    const down = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(50) });
    const spendAll: PlayCommand = {
      field: PlayCommandField.SpendResource,
      resource: Resource.HeroPoints,
      amount: ResourceCount.parse(3),
    };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: down.revision, command: spendAll });
    expect(saved.play.dying).toBe(Dying.parse(0));
    expect(saved.play.wounded).toBe(Wounded.parse(0));
  });

  test("someone else's character is not found", async () => {
    expect(await rejection(play.get(ezren, kyra.id))).toBeInstanceOf(NotFoundError);
    const edit = play.patch(ezren, kyra.id, { expectedRevision: FIRST_VERSION, command: damage(1) });
    expect(await rejection(edit)).toBeInstanceOf(NotFoundError);
  });

  test('daily preparations refuse a staff the character does not have, and a slot with no staff', async () => {
    const absent = newId();
    const staff: PlayCommand = { field: PlayCommandField.DailyPreparations, staff: InventoryItemId.parse(absent) };
    const slot: PlayCommand = {
      field: PlayCommandField.DailyPreparations,
      slot: { entry: Slug.parse('wizard'), rank: SpellRank.parse(1) },
    };
    const refusals = await Promise.all(
      [staff, slot].map(async (command) =>
        rejection(play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command })),
      ),
    );
    for (const refused of refusals) {
      expect(refused).toBeInstanceOf(ValidationError);
    }
  });

  test('daily preparations with no staff clear the staff charges', async () => {
    const command: PlayCommand = { field: PlayCommandField.DailyPreparations };
    const saved = await play.patch(amiri, kyra.id, { expectedRevision: FIRST_VERSION, command });
    expect(saved.play.resources.staff).toStrictEqual({});
  });
});
