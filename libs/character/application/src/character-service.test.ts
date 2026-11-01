import { beforeEach, describe, expect, test } from 'bun:test';

import {
  ANCESTRY_SLOT,
  CharacterCommand,
  CharacterId,
  CharacterLevel,
  CharacterName,
  CharacterPatchField,
  CharacterSort,
} from '@pioneer/character/domain';
import type { CharacterPatch, PatchCharacterBody } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { AncestryId, BlockKind, ChoiceValue, InlineKind, RichTextString, SlotKey } from '@pioneer/rules/sdk';
import type { RichText } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import {
  FIRST_VERSION,
  fixedClock,
  newId,
  NotFoundError,
  SortDirection,
  UserId,
  ValidationError,
  Version,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CharacterService } from './character-service';
import { InMemoryCharacterRepository } from './in-memory-character-repository';

const kyra = CharacterName.parse('Kyra');
const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

/** Rich text of one plain paragraph per argument. */
function paragraphs(...texts: readonly string[]): RichText {
  return texts.map((text) => ({
    type: BlockKind.Paragraph,
    content: [{ type: InlineKind.Text, text: RichTextString.parse(text) }],
  }));
}
const byName = { sort: CharacterSort.Name, direction: SortDirection.Asc } as const;
const human = ChoiceValue.parse(humanAncestryId);

/** An edit to a character still at its first version. */
function firstVersion(patch: CharacterPatch): PatchCharacterBody {
  return { expectedVersion: FIRST_VERSION, patch };
}

describe('CharacterService', () => {
  let service: CharacterService;
  let repository: InMemoryCharacterRepository;

  beforeEach(() => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    repository = new InMemoryCharacterRepository();
    service = new CharacterService(repository, content, fixedClock('2026-10-07T10:00:00Z'));
  });

  test('a sheet read twice over the same content is the same sheet', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const first = await service.sheet(created);
    const second = await service.sheet(created);
    expect(second).toEqual(first);
  });

  test('create assigns a UUIDv4 row id and the actor as owner; patch bumps the version', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    expect(created.id[14]).toBe('4');
    expect(created.ownerId).toBe(amiri);
    const { character: patched } = await service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Level,
        value: CharacterLevel.parse(2),
      }),
    );
    expect(patched.version).toBe(Version.parse(2));
    expect(patched.level).toBe(CharacterLevel.parse(2));
  });

  test('every write names its actor and command for the audit log', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const edits: readonly CharacterPatch[] = [
      { field: CharacterPatchField.Name, value: CharacterName.parse('Kyra the Bold') },
      { field: CharacterPatchField.SelectSlot, slot: ANCESTRY_SLOT, selection: human },
      { field: CharacterPatchField.ClearSlot, slot: ANCESTRY_SLOT },
      { field: CharacterPatchField.Level, value: CharacterLevel.parse(2) },
      {
        field: CharacterPatchField.SelectSlot,
        slot: SlotKey.parse('boost:1:free:0'),
        selection: ChoiceValue.parse('wis'),
      },
    ];
    let version = FIRST_VERSION;
    for (const patch of edits) {
      // oxlint-disable-next-line no-await-in-loop -- each edit needs the version the previous one saved
      const { character } = await service.patch(amiri, created.id, { expectedVersion: version, patch });
      ({ version } = character);
    }
    expect(repository.audits).toStrictEqual([
      { actor: amiri, command: CharacterCommand.CreateCharacter },
      { actor: amiri, command: CharacterCommand.RenameCharacter },
      { actor: amiri, command: CharacterCommand.SelectSlot },
      { actor: amiri, command: CharacterCommand.ClearSlot },
      { actor: amiri, command: CharacterCommand.SetLevel },
      { actor: amiri, command: CharacterCommand.SelectSlot },
    ]);
  });

  test('writing appearance and personality is audited by name and saved', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    const appearance = paragraphs('Tall, with a scar over the left eye.');
    const personality = paragraphs('Dry humour.', 'Loyal to a fault.');
    const first = await service.patch(amiri, created.id, {
      expectedVersion: FIRST_VERSION,
      patch: { field: CharacterPatchField.SetAppearance, value: appearance },
    });
    const second = await service.patch(amiri, created.id, {
      expectedVersion: first.character.version,
      patch: { field: CharacterPatchField.SetPersonality, value: personality },
    });
    expect(second.character.document.appearance).toStrictEqual(appearance);
    expect(second.character.document.personality).toStrictEqual(personality);
    expect(repository.audits.slice(1)).toStrictEqual([
      { actor: amiri, command: CharacterCommand.SetAppearance },
      { actor: amiri, command: CharacterCommand.SetPersonality },
    ]);
  });

  test('stale version is a conflict', async () => {
    const created = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Name,
        value: CharacterName.parse('Kyra II'),
      }),
    );
    const stale = service.patch(
      amiri,
      created.id,
      firstVersion({
        field: CharacterPatchField.Level,
        value: CharacterLevel.parse(3),
      }),
    );
    expect(await rejection(stale)).toBeInstanceOf(VersionConflictError);
  });

  test('unknown ancestry is rejected', async () => {
    const unknown = AncestryId.parse(newId());
    const created = service.create(amiri, { name: CharacterName.parse('X'), ancestry: unknown });
    const error = await rejection(created);
    expect(error).toBeInstanceOf(ValidationError);
    expect((error as ValidationError).issues).toStrictEqual([
      { path: ['ancestry'], message: { key: 'character.validation.unknownAncestry', params: { ancestry: unknown } } },
    ]);
  });

  test('missing character is not found', async () => {
    const missing = CharacterId.parse(newId());
    const error = await rejection(service.get(amiri, missing));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});

describe('CharacterService ownership', () => {
  let service: CharacterService;

  beforeEach(() => {
    const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
    service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  });

  test('list holds only the actor’s characters', async () => {
    await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
    await service.create(ezren, { name: CharacterName.parse('Seelah'), ancestry: humanAncestryId });
    const listed = await service.list(amiri, byName);
    expect(listed.map((character) => character.name)).toStrictEqual([kyra]);
  });

  test('another user’s character reads as not found', async () => {
    const theirs = await service.create(ezren, { name: kyra, ancestry: humanAncestryId });
    const error = await rejection(service.get(amiri, theirs.id));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });

  test('another user’s character cannot be patched, even with an invalid edit', async () => {
    const theirs = await service.create(ezren, { name: kyra, ancestry: humanAncestryId });
    const unknownAncestry = AncestryId.parse(newId());
    const edit = firstVersion({
      field: CharacterPatchField.SelectSlot,
      slot: ANCESTRY_SLOT,
      selection: ChoiceValue.parse(unknownAncestry),
    });
    const edited = service.patch(amiri, theirs.id, edit);
    expect(await rejection(edited)).toBeInstanceOf(NotFoundError);
    const unchanged = await service.get(ezren, theirs.id);
    expect(unchanged.version).toBe(FIRST_VERSION);
  });
});
