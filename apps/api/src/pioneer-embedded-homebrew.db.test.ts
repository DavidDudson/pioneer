import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { PioneerFileService } from '@pioneer/character/application';
import { Character, CharacterCommand, InventoryItemId, ItemQuantity, STOWED } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { DrizzleHomebrewPackRepository } from '@pioneer/homebrew/infrastructure';
import { HomebrewEntryOutcome, HomebrewPackStatus } from '@pioneer/interop/pioneer';
import type { PioneerCharacterFile } from '@pioneer/interop/pioneer';
import { contentEntries, contentEntryRow, contentPacks } from '@pioneer/rules/infrastructure';
import { PackId, PackVisibility } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { PioneerEmbeddedHomebrew } from './pioneer-embedded-homebrew';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-14T10:00:00Z');
const at = clock.now().toString();
const BREW = PackId.parse('moon-brew');
const one = ItemQuantity.parse(1);

/** A homebrew feat and a homebrew item, as the content tables hold them. */
const brew: readonly ContentEntry[] = new ContentPackBuilder()
  .withId(BREW)
  .withFeat('lunar-grace')
  .withItem('weapon', 'moon-blade', {
    baseItem: 'longsword',
    bulk: 1,
    category: 'martial',
    group: 'sword',
    damage: { dice: 1, die: 'd8', damageType: 'slashing' },
    usage: { type: 'held', hands: 'one' },
  })
  .build().otherEntries;

const FEAT_AND_ITEM = ['feat:lunar-grace', 'weapon:moon-blade'];

/** The slugs of `entries`, sorted. */
function slugsOf(entries: readonly ContentEntry[] = []): string[] {
  return entries.map((entry) => String(entry.slug)).toSorted();
}

function entryOfKind(kind: string): ContentEntry {
  const entry = brew.find((candidate) => candidate.kind === kind);
  if (entry === undefined) {
    throw new Error(`Expected a ${kind}`);
  }
  return entry;
}

/** A character named `name` (its id derives from it) of `owner` who picked the homebrew feat and carries the homebrew weapon. */
function brewer(owner: UserId, name: string): Character {
  const picked = new CharacterBuilder()
    .named(name)
    .ownedBy(owner)
    .picking('skill-feat:1', entryOfKind('feat').id)
    .build();
  return new Character({
    document: {
      ...picked.document,
      inventory: {
        ...picked.document.inventory,
        items: [{ id: InventoryItemId.parse(newId()), item: entryOfKind('weapon').id, quantity: one, carry: STOWED }],
      },
    },
    version: picked.version,
    createdAt: picked.createdAt,
    updatedAt: picked.updatedAt,
  });
}

describe.skipIf(adminUrl === undefined)('PioneerEmbeddedHomebrew (postgres)', () => {
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let service: PioneerFileService;
  let repository: DrizzleCharacterRepository;

  /** Amiri's `moon-brew`, holding the feat and the item. */
  async function seedBrew(visibility: PackVisibility): Promise<void> {
    const pack = new HomebrewPackBuilder().slug(BREW).titled('Moon brew').ownedBy(amiri).visibleTo(visibility).build();
    await new DrizzleHomebrewPackRepository(database.db).insert(pack);
    await database.db.insert(contentEntries).values(brew.map((entry) => contentEntryRow(pack.id, entry, at)));
  }

  async function exportedBy(owner: UserId, name: string): Promise<PioneerCharacterFile> {
    const saved = await repository.insert(brewer(owner, name), {
      actor: owner,
      command: CharacterCommand.CreateCharacter,
    });
    return service.export(owner, saved.id);
  }

  async function entrySlugsOf(owner: UserId): Promise<readonly string[]> {
    const rows = await database.db
      .select({ slug: contentEntries.slug })
      .from(contentEntries)
      .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
      .where(eq(contentPacks.ownerId, owner));
    return rows.map((row) => row.slug).toSorted();
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    repository = new DrizzleCharacterRepository(database.db);
    const policy = new PackAccessPolicy(new CampaignPackEnablementDirectory(database.db));
    const core = new ContentPackBuilder().withId('player-core').withAncestry('human').build();
    service = new PioneerFileService({
      repository,
      content: fixedContent(core),
      clock,
      homebrew: new PioneerEmbeddedHomebrew(database.db, clock, policy),
    });
  });

  beforeEach(async () => {
    await database.db.delete(contentPacks).where(eq(contentPacks.slug, BREW));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('exports the feat and item from a pack the exporter owns, and imports them for someone else', async () => {
    await seedBrew(PackVisibility.Private);
    const file = await exportedBy(amiri, 'Amiri 1');
    expect(slugsOf(file.homebrew?.[0]?.entries)).toStrictEqual(FEAT_AND_ITEM);
    await database.db.delete(contentPacks).where(eq(contentPacks.slug, BREW));

    const imported = await service.import(ezren, file);

    expect(await entrySlugsOf(ezren)).toStrictEqual(FEAT_AND_ITEM);
    const [pack] = await database.db.select().from(contentPacks).where(eq(contentPacks.slug, BREW));
    expect([pack?.ownerId, pack?.visibility, pack?.license, pack?.version]).toStrictEqual([
      ezren,
      PackVisibility.Private,
      'homebrew',
      nextVersion(FIRST_VERSION),
    ]);
    expect(await service.export(ezren, imported.id)).toStrictEqual(file);
  });

  test('importing again reuses what is there and writes nothing', async () => {
    await seedBrew(PackVisibility.Private);
    const file = await exportedBy(amiri, 'Amiri 2');
    await database.db.delete(contentPacks).where(eq(contentPacks.slug, BREW));
    await service.import(ezren, file);

    const preview = await service.preview(ezren, file);
    await service.import(ezren, file);

    expect(preview.homebrew.map((pack) => [pack.status, pack.entries.map((entry) => entry.outcome)])).toStrictEqual([
      [HomebrewPackStatus.Own, [HomebrewEntryOutcome.Reuse, HomebrewEntryOutcome.Reuse]],
    ]);
    const [pack] = await database.db.select().from(contentPacks).where(eq(contentPacks.slug, BREW));
    expect(pack?.version).toBe(nextVersion(FIRST_VERSION));
  });

  test("never writes into another user's pack, and does not tell whether a private one matches", async () => {
    await seedBrew(PackVisibility.Private);
    const file = await exportedBy(amiri, 'Amiri 3');

    const preview = await service.preview(ezren, file);
    await service.import(ezren, file);

    expect(preview.homebrew.map((pack) => [pack.status, pack.entries.map((entry) => entry.outcome)])).toStrictEqual([
      [HomebrewPackStatus.Taken, [HomebrewEntryOutcome.Clash, HomebrewEntryOutcome.Clash]],
    ]);
    expect(await entrySlugsOf(ezren)).toStrictEqual([]);
  });

  test("reuses identical entries of another user's public pack", async () => {
    await seedBrew(PackVisibility.Public);
    const file = await exportedBy(amiri, 'Amiri 4');

    const preview = await service.preview(ezren, file);

    expect(preview.homebrew.map((pack) => [pack.status, pack.entries.map((entry) => entry.outcome)])).toStrictEqual([
      [HomebrewPackStatus.Taken, [HomebrewEntryOutcome.Reuse, HomebrewEntryOutcome.Reuse]],
    ]);
  });

  test("refuses to export a private pack's content for someone who cannot read it", async () => {
    await seedBrew(PackVisibility.Private);

    const saved = await repository.insert(brewer(ezren, 'Ezren'), {
      actor: ezren,
      command: CharacterCommand.CreateCharacter,
    });

    expect(await rejection(service.export(ezren, saved.id))).toBeInstanceOf(ValidationError);
  });
});
