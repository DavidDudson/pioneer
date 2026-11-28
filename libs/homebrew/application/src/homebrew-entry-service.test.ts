import { beforeEach, describe, expect, test } from 'bun:test';

import { HOMEBREW_ENTRY_KINDS } from '@pioneer/homebrew/domain';
import type { CreateHomebrewEntryBody } from '@pioneer/homebrew/domain';
import {
  ContentId,
  ContentKind,
  ContentLevel,
  contentPackId,
  ContentText,
  EntrySlug,
  PackId,
  Rarity,
  Trait,
} from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, NotFoundError, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { HomebrewEntryService } from './homebrew-entry-service';
import { HomebrewMessage } from './homebrew-message';
import { HomebrewPackService } from './homebrew-pack-service';
import { InMemoryAuthorDirectory } from './in-memory-author-directory';
import { InMemoryHomebrewEntryRepository } from './in-memory-homebrew-entry-repository';
import { InMemoryHomebrewPackRepository } from './in-memory-homebrew-pack-repository';
import { InMemoryPackDependencyRepository } from './in-memory-pack-dependency-repository';
import { InMemoryPackDirectory } from './in-memory-pack-directory';
import { InMemoryPackEnablementDirectory } from './in-memory-pack-enablement-directory';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

const FIRST_LEVEL = ContentLevel.parse(1);
const THIRD_LEVEL = ContentLevel.parse(3);

const sword: CreateHomebrewEntryBody = {
  kind: ContentKind.Feat,
  name: ContentText.parse('Rending Strike'),
  level: FIRST_LEVEL,
  rarity: Rarity.Common,
  traits: [Trait.parse('fighter')],
};

describe('HomebrewEntryService', () => {
  let service: HomebrewEntryService;
  let entries: InMemoryHomebrewEntryRepository;
  let pack: ContentPackId;

  beforeEach(async () => {
    const packs = new InMemoryHomebrewPackRepository();
    entries = new InMemoryHomebrewEntryRepository();
    const clock = fixedClock('2026-10-10T10:00:00Z');

    const packService = new HomebrewPackService(
      {
        packs,
        authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
        enablement: new InMemoryPackEnablementDirectory(),
        directory: new InMemoryPackDirectory(packs),
        dependencies: new InMemoryPackDependencyRepository(),
      },
      clock,
    );

    service = new HomebrewEntryService({ packs, entries }, clock);

    const created = await packService.create(amiri, {
      title: ContentText.parse('Amiri feats'),
      slug: PackId.parse('amiri-feats'),
    });

    pack = created.id;
  });

  test('create files the entry under its kind and name, and lists it', async () => {
    const created = await service.create(amiri, pack, sword);

    expect(created.slug).toBe(EntrySlug.parse('feat:rending-strike'));
    expect(created.packId).toBe(contentPackId(PackId.parse('amiri-feats')));
    expect(await service.list(amiri, pack, false)).toStrictEqual([created]);
    expect(await service.list(amiri, pack, true)).toStrictEqual([]);
  });

  test('create is credited to the author and audited', async () => {
    await service.create(amiri, pack, sword);

    expect(entries.writes.map(({ actor, command }) => [actor, command])).toStrictEqual([
      [amiri, 'createHomebrewEntry'],
    ]);
  });

  test('another user, who may read nothing of it, gets a 404 on every use', async () => {
    const created = await service.create(amiri, pack, sword);

    const attempts: Array<Promise<unknown>> = [
      service.list(ezren, pack, false),
      service.create(ezren, pack, sword),
      service.update(ezren, { pack, id: created.id }, { ...sword }),
      service.archive(ezren, { pack, id: created.id }),
      service.restore(ezren, { pack, id: created.id }),
    ];

    const failures = await Promise.all(attempts.map(async (attempt) => rejection(attempt)));

    expect(failures.every((failure) => failure instanceof NotFoundError)).toBe(true);
  });

  test('a name already used by that kind in the pack is a conflict, even while archived', async () => {
    const created = await service.create(amiri, pack, sword);

    const live = await rejection(
      service.create(amiri, pack, { ...sword, name: ContentText.parse('rending  strike!') }),
    );

    expect(live).toBeInstanceOf(ConflictError);

    await service.archive(amiri, { pack, id: created.id });
    const archived = await rejection(service.create(amiri, pack, sword));

    expect(archived).toBeInstanceOf(ConflictError);
    expect(archived).toMatchObject({ descriptor: { key: HomebrewMessage.EntrySlugTaken } });
  });

  test('the same name under another kind is a different entry with another id', async () => {
    const feat = await service.create(amiri, pack, sword);
    const action = await service.create(amiri, pack, { ...sword, kind: ContentKind.Action, level: undefined });

    expect(action.slug).toBe(EntrySlug.parse('action:rending-strike'));
    expect(action.id).not.toBe(feat.id);
  });

  test('update changes the fields and keeps the kind, slug and id', async () => {
    const created = await service.create(amiri, pack, sword);

    const updated = await service.update(
      amiri,
      { pack, id: created.id },
      {
        name: ContentText.parse('Rending Strike (Greater)'),
        level: THIRD_LEVEL,
        rarity: Rarity.Uncommon,
        traits: [],
      },
    );

    expect(updated).toMatchObject({ id: created.id, slug: created.slug, kind: ContentKind.Feat, level: THIRD_LEVEL });
    expect(updated.name).toBe(ContentText.parse('Rending Strike (Greater)'));
    expect(updated.rarity).toBe(Rarity.Uncommon);
  });

  test('archive hides the entry from the list and restore brings it back, both harmless twice', async () => {
    const created = await service.create(amiri, pack, sword);

    const archived = await service.archive(amiri, { pack, id: created.id });
    await service.archive(amiri, { pack, id: created.id });

    expect(archived.archivedAt).toBeDefined();
    expect(await service.list(amiri, pack, false)).toStrictEqual([]);
    expect(await service.list(amiri, pack, true)).toStrictEqual([archived]);

    const restored = await service.restore(amiri, { pack, id: created.id });
    await service.restore(amiri, { pack, id: created.id });

    expect(restored.archivedAt).toBeUndefined();
    expect(await service.list(amiri, pack, false)).toStrictEqual([restored]);
  });

  test('an archived entry cannot be edited', async () => {
    const created = await service.create(amiri, pack, sword);
    await service.archive(amiri, { pack, id: created.id });

    expect(await rejection(service.update(amiri, { pack, id: created.id }, { ...sword }))).toBeInstanceOf(
      NotFoundError,
    );
  });

  test('an entry the pack does not hold is a 404', async () => {
    const missing = ContentId.parse(newId());

    expect(await rejection(service.archive(amiri, { pack, id: missing }))).toBeInstanceOf(NotFoundError);
  });

  test('a kind that needs other entries, a name with no letters, and fields the schema refuses are 422s', async () => {
    const needsEntries = await rejection(service.create(amiri, pack, { ...sword, kind: ContentKind.Kit }));
    const noLetters = await rejection(service.create(amiri, pack, { ...sword, name: ContentText.parse('???') }));
    const noLevel = await rejection(service.create(amiri, pack, { ...sword, level: undefined }));

    expect(needsEntries).toBeInstanceOf(ValidationError);
    expect(noLetters).toBeInstanceOf(ValidationError);
    expect(noLevel).toBeInstanceOf(ValidationError);
  });

  test.each(HOMEBREW_ENTRY_KINDS)('a new %s entry satisfies its kind', async (kind) => {
    const created = await service.create(amiri, pack, { ...sword, kind, level: FIRST_LEVEL });

    expect(created.kind).toBe(kind);
  });
});
