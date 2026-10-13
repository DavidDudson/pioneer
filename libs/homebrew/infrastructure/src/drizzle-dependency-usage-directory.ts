import { DependencyUsageDirectory } from '@pioneer/homebrew/application';
import { UsingEntryName } from '@pioneer/homebrew/domain';
import { contentEntries } from '@pioneer/rules/infrastructure';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

const UUID = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

/** Whether any string in the JSON value is one of `ids`: an entry references another by its id wherever it does. */
function mentionsAny(value: unknown, ids: ReadonlySet<string>): boolean {
  if (typeof value === 'string') {
    return UUID.test(value) && ids.has(value.toLowerCase());
  }
  if (Array.isArray(value)) {
    return value.some((item) => mentionsAny(item, ids));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some((item) => mentionsAny(item, ids));
  }
  return false;
}

export class DrizzleDependencyUsageDirectory extends DependencyUsageDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async entriesUsing(
    pack: ContentPackId,
    dependsOn: ContentPackId,
  ): Promise<readonly UsingEntryName[]> {
    const offered = await this.#db
      .select({ id: contentEntries.id })
      .from(contentEntries)
      .where(eq(contentEntries.packId, dependsOn));
    if (offered.length === 0) {
      return [];
    }
    const ids = new Set(offered.map((entry) => entry.id.toLowerCase()));
    const own = await this.#db
      .select({ name: contentEntries.name, data: contentEntries.data })
      .from(contentEntries)
      .where(eq(contentEntries.packId, pack));
    // Sorted here so no query needs an index for it.
    return own
      .filter((entry) => mentionsAny(entry.data, ids))
      .map((entry) => UsingEntryName.parse(entry.name))
      .toSorted((left, right) => left.localeCompare(right));
  }
}
