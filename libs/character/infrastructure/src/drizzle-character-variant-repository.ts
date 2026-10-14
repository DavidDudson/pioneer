import { CharacterVariantRepository } from '@pioneer/character/application';
import type { CharacterId, CharacterVariantRule } from '@pioneer/character/domain';
import type { VariantRuleId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterVariantRules } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ENABLE_COMMAND = 'enable-character-variant-rule';
const DISABLE_COMMAND = 'disable-character-variant-rule';

type CharacterVariantRuleRow = typeof characterVariantRules.$inferSelect;

function toCharacterVariantRule(row: CharacterVariantRuleRow): CharacterVariantRule {
  return {
    id: row.id,
    variantId: row.variantId,
    enabledBy: row.enabledBy ?? undefined,
    enabledAt: Temporal.Instant.from(row.enabledAt),
  };
}

export class DrizzleCharacterVariantRepository extends CharacterVariantRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterVariantRule[]> {
    const rows = await this.#db
      .select()
      .from(characterVariantRules)
      .where(eq(characterVariantRules.characterId, characterId));
    // Sorted here so no query needs an index for it; a character enables few variant rules.
    return rows
      .map((row) => toCharacterVariantRule(row))
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
      );
  }

  public override async enable(actor: UserId, characterId: CharacterId, rule: CharacterVariantRule): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ENABLE_COMMAND });
      await tx
        .insert(characterVariantRules)
        .values({
          id: rule.id,
          characterId,
          variantId: rule.variantId,
          enabledBy: rule.enabledBy,
          enabledAt: rule.enabledAt.toString(),
        })
        .onConflictDoNothing({ target: [characterVariantRules.characterId, characterVariantRules.variantId] });
    });
  }

  public override async disable(actor: UserId, characterId: CharacterId, variantId: VariantRuleId): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: DISABLE_COMMAND });
      await tx
        .delete(characterVariantRules)
        .where(and(eq(characterVariantRules.characterId, characterId), eq(characterVariantRules.variantId, variantId)));
    });
  }
}
