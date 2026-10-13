import { FeatDisplayRepository } from '@pioneer/character/application';
import type { FeatDisplayKey, FeatDisplaySetting } from '@pioneer/character/application';
import { FeatDisplayId } from '@pioneer/character/domain';
import type { FeatDisplaySection } from '@pioneer/character/domain';
import { newId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { and, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterFeatDisplays } from './character.table';

export class DrizzleFeatDisplayRepository extends FeatDisplayRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async findShown({ userId, characterId }: FeatDisplayKey): Promise<readonly FeatDisplaySection[]> {
    const rows = await this.#db
      .select({ section: characterFeatDisplays.section })
      .from(characterFeatDisplays)
      .where(
        and(
          eq(characterFeatDisplays.userId, userId),
          eq(characterFeatDisplays.characterId, characterId),
          eq(characterFeatDisplays.showGrantOnly, true),
        ),
      );
    return rows.map((row) => row.section);
  }

  /** One upsert on the (user, character, section) index, so two first choices at once can't both insert. */
  public override async save(
    key: FeatDisplayKey,
    { section, showGrantOnly }: FeatDisplaySetting,
    now: Temporal.Instant,
  ): Promise<void> {
    const updatedAt = now.toString();
    await this.#db
      .insert(characterFeatDisplays)
      .values({ ...key, id: FeatDisplayId.parse(newId()), section, showGrantOnly, updatedAt })
      .onConflictDoUpdate({
        target: [characterFeatDisplays.userId, characterFeatDisplays.characterId, characterFeatDisplays.section],
        set: { showGrantOnly, updatedAt },
      });
  }
}
