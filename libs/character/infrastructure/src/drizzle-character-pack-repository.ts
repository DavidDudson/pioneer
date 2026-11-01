import { CharacterPackRepository } from '@pioneer/character/application';
import type { CharacterId, CharacterPack } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { RequestMemo, stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterPacks } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ENABLE_COMMAND = 'enable-character-pack';
const DISABLE_COMMAND = 'disable-character-pack';

type CharacterPackRow = typeof characterPacks.$inferSelect;

function toCharacterPack(row: CharacterPackRow): CharacterPack {
  return {
    id: row.id,
    packId: row.packId,
    enabledBy: row.enabledBy ?? undefined,
    enabledAt: Temporal.Instant.from(row.enabledAt),
  };
}

export class DrizzleCharacterPackRepository extends CharacterPackRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;
  readonly #listed = new RequestMemo<CharacterId, readonly CharacterPack[]>();

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterPack[]> {
    return this.#listed.of(characterId, async () => {
      const rows = await this.#db.select().from(characterPacks).where(eq(characterPacks.characterId, characterId));
      // Sorted here so no query needs an index for it; a character enables few packs.
      return rows
        .map((row) => toCharacterPack(row))
        .toSorted(
          (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
        );
    });
  }

  public override async enable(
    actor: UserId,
    characterId: CharacterId,
    packs: readonly CharacterPack[],
  ): Promise<void> {
    if (packs.length === 0) {
      return;
    }
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ENABLE_COMMAND });
      await tx
        .insert(characterPacks)
        .values(
          packs.map((pack) => ({
            id: pack.id,
            characterId,
            packId: pack.packId,
            enabledBy: pack.enabledBy,
            enabledAt: pack.enabledAt.toString(),
          })),
        )
        .onConflictDoNothing({ target: [characterPacks.characterId, characterPacks.packId] });
    });
  }

  public override async disable(actor: UserId, characterId: CharacterId, packId: ContentPackId): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: DISABLE_COMMAND });
      await tx
        .delete(characterPacks)
        .where(and(eq(characterPacks.characterId, characterId), eq(characterPacks.packId, packId)));
    });
  }
}
