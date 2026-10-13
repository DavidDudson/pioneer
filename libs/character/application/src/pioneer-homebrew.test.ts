import { beforeEach, describe, expect, test } from 'bun:test';

import {
  Character,
  CharacterCommand,
  CharacterListQuery,
  InventoryItemId,
  ItemQuantity,
  STOWED,
} from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { EmbeddedPack, HomebrewEntryOutcome, HomebrewPackStatus } from '@pioneer/interop/pioneer';
import type { PioneerCharacterFile } from '@pioneer/interop/pioneer';
import { ContentLicense, ContentText, PackId } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { InMemoryCharacterRepository } from './in-memory-character-repository';
import { InMemoryEmbeddedHomebrew } from './in-memory-embedded-homebrew';
import { PioneerFileService } from './pioneer-file-service';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');
const BREW = PackId.parse('moon-brew');
const FEAT_SLOT = 'skill-feat:1';
const one = ItemQuantity.parse(1);

/** The feat and the item; the feat is a 1st-level one unless `featLevel` says otherwise, so two packs can differ. */
function brewEntries(featLevel = 1): readonly ContentEntry[] {
  const { otherEntries } = new ContentPackBuilder()
    .withId(BREW)
    .withFeat('lunar-grace', { level: featLevel })
    .withItem('weapon', 'moon-blade', {
      baseItem: 'longsword',
      bulk: 1,
      category: 'martial',
      group: 'sword',
      damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      usage: { type: 'held', hands: 'one' },
    })
    .build();
  return otherEntries;
}

const FEAT_AND_ITEM = ['feat:lunar-grace', 'weapon:moon-blade'];

/** The slugs of `entries`, sorted. */
function slugsOf(entries: readonly ContentEntry[] = []): string[] {
  return entries.map((entry) => String(entry.slug)).toSorted();
}

function homebrewOf(file: PioneerCharacterFile): readonly EmbeddedPack[] {
  return file.homebrew ?? [];
}

function brewPack(entries: readonly ContentEntry[] = brewEntries()): EmbeddedPack {
  return EmbeddedPack.parse({
    pack: {
      id: BREW,
      title: ContentText.parse('Moon brew'),
      publisher: ContentText.parse('Amiri'),
      license: ContentLicense.Homebrew,
    },
    entries,
  });
}

function entryOf(kind: string): ContentEntry {
  const entry = brewEntries().find((candidate) => candidate.kind === kind);
  if (entry === undefined) {
    throw new Error(`Expected a ${kind}`);
  }
  return entry;
}

/** A character of `owner` who picked the homebrew feat and carries the homebrew weapon. */
function brewer(owner: UserId): Character {
  const picked = new CharacterBuilder().ownedBy(owner).picking(FEAT_SLOT, entryOf('feat').id).build();
  return new Character({
    document: {
      ...picked.document,
      inventory: {
        ...picked.document.inventory,
        items: [{ id: InventoryItemId.parse(newId()), item: entryOf('weapon').id, quantity: one, carry: STOWED }],
      },
    },
    version: picked.version,
    createdAt: picked.createdAt,
    updatedAt: picked.updatedAt,
  });
}

/** A server: its characters, its homebrew store, and the service over both. */
interface Server {
  readonly homebrew: InMemoryEmbeddedHomebrew;
  readonly repository: InMemoryCharacterRepository;
  readonly service: PioneerFileService;
}

function server(): Server {
  const homebrew = new InMemoryEmbeddedHomebrew();
  const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
  const repository = new InMemoryCharacterRepository();
  const service = new PioneerFileService({ repository, content: fixedContent(core), clock, homebrew });
  return { homebrew, repository, service };
}

describe('Pioneer files with embedded homebrew', () => {
  let origin: Server;
  let file: PioneerCharacterFile;

  beforeEach(async () => {
    origin = server();
    origin.homebrew.seed(amiri, brewPack());
    const repository = new InMemoryCharacterRepository();
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    const service = new PioneerFileService({
      repository,
      content: fixedContent(core),
      clock,
      homebrew: origin.homebrew,
    });
    const saved = await repository.insert(brewer(amiri), { actor: amiri, command: CharacterCommand.CreateCharacter });
    file = await service.export(amiri, saved.id);
  });

  test('an export carries the homebrew feat and item the character uses, with the pack and its licence', () => {
    const [pack] = homebrewOf(file);

    expect(pack?.pack).toMatchObject({
      id: BREW,
      title: 'Moon brew',
      publisher: 'Amiri',
      license: ContentLicense.Homebrew,
    });
    expect(slugsOf(pack?.entries)).toStrictEqual(FEAT_AND_ITEM);
    expect(pack?.entries.map((entry) => entry.sources.length)).toStrictEqual([1, 1]);
  });

  test('is refused when the exporter cannot read the homebrew', async () => {
    const stranger = server();
    const repository = new InMemoryCharacterRepository();
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    const service = new PioneerFileService({
      repository,
      content: fixedContent(core),
      clock,
      homebrew: stranger.homebrew,
    });
    const saved = await repository.insert(brewer(ezren), { actor: ezren, command: CharacterCommand.CreateCharacter });

    expect(await rejection(service.export(ezren, saved.id))).toBeInstanceOf(ValidationError);
  });

  test('an import makes the pack for the importer, and exporting the result gives the same file', async () => {
    const target = server();

    const preview = await target.service.preview(ezren, file);
    expect(preview.unmatched).toStrictEqual([]);
    expect(preview.homebrew.map((pack) => [pack.pack, pack.status])).toStrictEqual([[BREW, HomebrewPackStatus.New]]);

    const imported = await target.service.import(ezren, file);

    expect(slugsOf(target.homebrew.entriesOf(BREW))).toStrictEqual(FEAT_AND_ITEM);
    expect(await target.service.export(ezren, imported.id)).toStrictEqual(file);
  });

  test('importing again reuses the identical entries', async () => {
    const target = server();
    await target.service.import(ezren, file);

    const preview = await target.service.preview(ezren, file);

    expect(preview.homebrew.map((pack) => [pack.status, pack.entries.map((entry) => entry.outcome)])).toStrictEqual([
      [HomebrewPackStatus.Own, [HomebrewEntryOutcome.Reuse, HomebrewEntryOutcome.Reuse]],
    ]);
    await target.service.import(ezren, file);
    expect(target.homebrew.entriesOf(BREW)).toHaveLength(2);
  });

  test('never overwrites a different entry in the pack: the clash is reported and the character still imports', async () => {
    const target = server();
    target.homebrew.seed(amiri, brewPack(brewEntries(3)));

    const preview = await target.service.preview(ezren, file);

    expect(
      preview.homebrew.map((pack) => [pack.status, pack.entries.map((entry) => entry.outcome).toSorted()]),
    ).toStrictEqual([[HomebrewPackStatus.Taken, [HomebrewEntryOutcome.Clash, HomebrewEntryOutcome.Reuse]]]);
    const before = target.homebrew.entriesOf(BREW);
    await target.service.import(ezren, file);
    expect(target.homebrew.entriesOf(BREW)).toStrictEqual(before);
    expect(await target.repository.listForOwner(ezren, CharacterListQuery.parse({}))).toHaveLength(1);
  });

  test('does not list embedded entries as unmatched content', async () => {
    const preview = await server().service.preview(ezren, file);

    expect(preview.unmatched).toStrictEqual([]);
  });
});
