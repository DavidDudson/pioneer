import { CharacterItemAcknowledgementRepository } from '@pioneer/character/application';
import type { ItemAcknowledgementRevocation } from '@pioneer/character/application';
import type { CharacterId, ItemAcknowledgement } from '@pioneer/character/domain';
import { ContentId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterItemAcknowledgements } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ACKNOWLEDGE_COMMAND = 'acknowledge-character-item';
const REVOKE_COMMAND = 'revoke-character-item-acknowledgement';

/** Stored for every rule but a rune not allowed, so the live-row unique index needs no nullable column. */
const NO_RUNE = ContentId.parse('00000000-0000-0000-0000-000000000000');

type CharacterItemAcknowledgementRow = typeof characterItemAcknowledgements.$inferSelect;

function toAcknowledgement(row: CharacterItemAcknowledgementRow): ItemAcknowledgement {
  return {
    id: row.id,
    item: row.itemId,
    rule: row.rule,
    rune: row.rune === NO_RUNE ? undefined : row.rune,
    value: row.value,
    acknowledgedBy: row.acknowledgedBy ?? undefined,
    acknowledgedAt: Temporal.Instant.from(row.acknowledgedAt),
  };
}

export class DrizzleCharacterItemAcknowledgementRepository extends CharacterItemAcknowledgementRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<readonly ItemAcknowledgement[]> {
    const rows = await this.#db
      .select()
      .from(characterItemAcknowledgements)
      .where(
        and(
          eq(characterItemAcknowledgements.characterId, characterId),
          isNull(characterItemAcknowledgements.archivedAt),
        ),
      )
      .orderBy(asc(characterItemAcknowledgements.acknowledgedAt), asc(characterItemAcknowledgements.id));
    return rows.map((row) => toAcknowledgement(row));
  }

  public override async acknowledge(
    actor: UserId,
    characterId: CharacterId,
    acknowledgement: ItemAcknowledgement,
  ): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ACKNOWLEDGE_COMMAND });
      await tx
        .insert(characterItemAcknowledgements)
        .values({
          id: acknowledgement.id,
          characterId,
          itemId: acknowledgement.item,
          rule: acknowledgement.rule,
          rune: acknowledgement.rune ?? NO_RUNE,
          value: acknowledgement.value,
          acknowledgedBy: acknowledgement.acknowledgedBy,
          acknowledgedAt: acknowledgement.acknowledgedAt.toString(),
        })
        .onConflictDoUpdate({
          target: [
            characterItemAcknowledgements.characterId,
            characterItemAcknowledgements.itemId,
            characterItemAcknowledgements.rule,
            characterItemAcknowledgements.rune,
          ],
          targetWhere: isNull(characterItemAcknowledgements.archivedAt),
          set: {
            value: acknowledgement.value,
            acknowledgedBy: acknowledgement.acknowledgedBy,
            acknowledgedAt: acknowledgement.acknowledgedAt.toString(),
          },
        });
    });
  }

  public override async revoke(
    actor: UserId,
    characterId: CharacterId,
    { id, at }: ItemAcknowledgementRevocation,
  ): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: REVOKE_COMMAND });
      await tx
        .update(characterItemAcknowledgements)
        .set({ archivedAt: at.toString() })
        .where(
          and(
            eq(characterItemAcknowledgements.id, id),
            eq(characterItemAcknowledgements.characterId, characterId),
            isNull(characterItemAcknowledgements.archivedAt),
          ),
        );
    });
  }
}
