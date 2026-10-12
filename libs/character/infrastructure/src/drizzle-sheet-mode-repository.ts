import { SheetModeRepository } from '@pioneer/character/application';
import type { SheetModeKey } from '@pioneer/character/application';
import { SheetModeId } from '@pioneer/character/domain';
import type { SheetMode } from '@pioneer/character/domain';
import { newId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterSheetModes } from './character.table';

export class DrizzleSheetModeRepository extends SheetModeRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async findFor({ userId, characterId }: SheetModeKey): Promise<SheetMode | undefined> {
    const [row] = await this.#db
      .select({ mode: characterSheetModes.mode })
      .from(characterSheetModes)
      .where(and(eq(characterSheetModes.userId, userId), eq(characterSheetModes.characterId, characterId)))
      .limit(1);
    return row?.mode;
  }

  /** One upsert on the (user, character) index, so two first switches at once can't both insert. */
  public override async save(key: SheetModeKey, mode: SheetMode, now: Temporal.Instant): Promise<void> {
    const updatedAt = now.toString();
    await this.#db
      .insert(characterSheetModes)
      .values({ ...key, id: SheetModeId.parse(newId()), mode, updatedAt })
      .onConflictDoUpdate({
        target: [characterSheetModes.userId, characterSheetModes.characterId],
        set: { mode, updatedAt },
      });
  }
}
