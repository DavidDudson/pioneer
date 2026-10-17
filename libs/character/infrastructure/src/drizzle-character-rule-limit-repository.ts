import { CharacterRuleLimitRepository } from '@pioneer/character/application';
import type { CharacterId, CharacterRuleLimit, RuleLimitField } from '@pioneer/character/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterRuleLimits } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const SET_COMMAND = 'set-character-rule-limit';
const RESET_COMMAND = 'reset-character-rule-limit';

type CharacterRuleLimitRow = typeof characterRuleLimits.$inferSelect;

function toCharacterRuleLimit(row: CharacterRuleLimitRow): CharacterRuleLimit {
  return {
    id: row.id,
    limit: row.limit,
    value: row.value,
    setBy: row.setBy ?? undefined,
    setAt: Temporal.Instant.from(row.setAt),
  };
}

export class DrizzleCharacterRuleLimitRepository extends CharacterRuleLimitRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterRuleLimit[]> {
    const rows = await this.#db
      .select()
      .from(characterRuleLimits)
      .where(eq(characterRuleLimits.characterId, characterId));
    return rows.map((row) => toCharacterRuleLimit(row));
  }

  public override async set(actor: UserId, characterId: CharacterId, limit: CharacterRuleLimit): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: SET_COMMAND });
      await tx
        .insert(characterRuleLimits)
        .values({
          id: limit.id,
          characterId,
          limit: limit.limit,
          value: limit.value,
          setBy: limit.setBy,
          setAt: limit.setAt.toString(),
        })
        .onConflictDoUpdate({
          target: [characterRuleLimits.characterId, characterRuleLimits.limit],
          set: { value: limit.value, setBy: limit.setBy, setAt: limit.setAt.toString() },
        });
    });
  }

  public override async reset(actor: UserId, characterId: CharacterId, limit: RuleLimitField): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: RESET_COMMAND });
      await tx
        .delete(characterRuleLimits)
        .where(and(eq(characterRuleLimits.characterId, characterId), eq(characterRuleLimits.limit, limit)));
    });
  }
}
