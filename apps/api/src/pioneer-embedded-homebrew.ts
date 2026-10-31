import { EmbeddedHomebrew } from '@pioneer/character/application';
import type { PackAccessPolicy, ReadablePack } from '@pioneer/homebrew/application';
import { HomebrewPack } from '@pioneer/homebrew/domain';
import { DrizzleHomebrewPackRepository } from '@pioneer/homebrew/infrastructure';
import { HomebrewPackStatus } from '@pioneer/interop/pioneer';
import type { EmbeddedPack, ExistingPack, ExistingPacks, HomebrewPackPlan } from '@pioneer/interop/pioneer';
import { contentEntries, contentEntryRow, contentHash, contentPacks } from '@pioneer/rules/infrastructure';
import { ContentEntry, ContentLicense, contentPackId } from '@pioneer/rules/sdk';
import type { ContentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { nextVersion } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import type { Database } from './database';

/** Names the command on the audit rows an import's homebrew writes. */
const IMPORT_COMMAND = 'import-pioneer-homebrew';

type PackRow = typeof contentPacks.$inferSelect;

function readable(row: PackRow): ReadablePack {
  return { id: row.id, ownerId: row.ownerId ?? undefined, visibility: row.visibility };
}

/**
 * The character context's `EmbeddedHomebrew` over the content tables. It lives in the composition root because
 * neither the character nor the homebrew context may import the other. An archived pack is treated as absent too
 * (ADR-0062), and as held by someone else when importing, so a file never writes into it. A pack the actor may not
 * read is treated as absent when exporting and as held by someone else, with no entries to compare, when importing,
 * so a file can't be used to probe it.
 */
export class PioneerEmbeddedHomebrew extends EmbeddedHomebrew {
  readonly #db: Database;
  readonly #clock: Clock;
  readonly #policy: PackAccessPolicy;
  readonly #packs: DrizzleHomebrewPackRepository;

  public constructor(db: Database, clock: Clock, policy: PackAccessPolicy) {
    super();
    this.#db = db;
    this.#clock = clock;
    this.#policy = policy;
    this.#packs = new DrizzleHomebrewPackRepository(db);
  }

  public override async holding(actor: UserId, ids: readonly ContentId[]): Promise<readonly EmbeddedPack[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.#db
      .select({ pack: contentPacks, entry: contentEntries.data })
      .from(contentEntries)
      .innerJoin(contentPacks, eq(contentPacks.id, contentEntries.packId))
      .where(and(inArray(contentEntries.id, [...ids]), isNull(contentPacks.archivedAt)));
    const byPack = new Map<PackRow['id'], { pack: PackRow; entries: ContentEntry[] }>();
    for (const { pack, entry } of rows) {
      const held = byPack.get(pack.id) ?? { pack, entries: [] };
      held.entries.push(ContentEntry.parse(entry));
      byPack.set(pack.id, held);
    }
    const embedded = await Promise.all(
      [...byPack.values()].map(async ({ pack, entries }): Promise<EmbeddedPack | undefined> => {
        const mayRead = pack.ownerId !== null && (await this.#policy.mayRead(actor, readable(pack)));
        return mayRead
          ? {
              pack: { id: pack.slug, title: pack.title, publisher: pack.publisher, license: ContentLicense.Homebrew },
              entries: entries.toSorted((left, right) => left.slug.localeCompare(right.slug)),
            }
          : undefined;
      }),
    );
    return embedded
      .filter((pack) => pack !== undefined)
      .toSorted((left, right) => left.pack.id.localeCompare(right.pack.id));
  }

  public override async existing(actor: UserId, packs: readonly PackId[]): Promise<ExistingPacks> {
    if (packs.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select()
      .from(contentPacks)
      .where(inArray(contentPacks.slug, [...packs]));
    const existing = await Promise.all(
      rows.map(async (row): Promise<[PackId, ExistingPack]> => {
        const mayRead = row.ownerId === null || (await this.#policy.mayRead(actor, readable(row)));
        return [
          row.slug,
          {
            ownedByImporter: row.ownerId === actor && row.archivedAt === null,
            entries: mayRead && row.archivedAt === null ? await this.#entriesOf(row) : new Map(),
          },
        ];
      }),
    );
    return new Map(existing);
  }

  public override async apply(actor: UserId, plans: readonly HomebrewPackPlan[]): Promise<void> {
    await Promise.all(plans.map(async (plan) => this.#write(actor, plan)));
  }

  /** One pack: made first when it is new, then given its entries. Packs are independent, so these run together. */
  async #write(actor: UserId, plan: HomebrewPackPlan): Promise<void> {
    if (plan.report.status === HomebrewPackStatus.New) {
      await this.#packs.insert(this.#newPack(actor, plan));
    }
    if (plan.toCreate.length > 0) {
      await this.#addEntries(actor, plan);
    }
  }

  #newPack(actor: UserId, { embedded }: HomebrewPackPlan): HomebrewPack {
    const { id, title, publisher } = embedded.pack;
    return HomebrewPack.create({
      id: contentPackId(id),
      slug: id,
      title,
      publisher,
      ownerId: actor,
      now: this.#clock.now(),
    });
  }

  async #entriesOf(pack: PackRow): Promise<ReadonlyMap<EntrySlug, ContentEntry>> {
    const rows = await this.#db
      .select({ data: contentEntries.data })
      .from(contentEntries)
      .where(eq(contentEntries.packId, pack.id));
    return new Map(rows.map(({ data }) => [data.slug, data]));
  }

  /**
   * Adds the entries to a pack `actor` owns, as one change: the pack is locked, the entries are written next to the
   * ones it has, and its version and hash move on. A pack that is not theirs (it was taken since planning) gets
   * nothing, and an entry that is there by now is left as it is.
   */
  async #addEntries(actor: UserId, { embedded, toCreate }: HomebrewPackPlan): Promise<void> {
    const at = this.#clock.now().toString();
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: IMPORT_COMMAND });
      const mine = and(
        eq(contentPacks.id, contentPackId(embedded.pack.id)),
        eq(contentPacks.ownerId, actor),
        isNull(contentPacks.archivedAt),
      );
      const [locked] = await tx.select().from(contentPacks).where(mine).for('update');
      if (locked === undefined) {
        return;
      }
      await tx
        .insert(contentEntries)
        .values(toCreate.map((entry) => contentEntryRow(locked.id, entry, at)))
        .onConflictDoNothing({ target: contentEntries.id });
      const rows = await tx
        .select({ data: contentEntries.data })
        .from(contentEntries)
        .where(eq(contentEntries.packId, locked.id));
      const hash = contentHash({ file: locked.data, entries: rows.map(({ data }) => data) });
      await tx
        .update(contentPacks)
        .set({ version: nextVersion(locked.version), updatedAt: at, contentHash: hash })
        .where(eq(contentPacks.id, locked.id));
    });
  }
}
