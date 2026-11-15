import { DependencyUsageDirectory } from '@pioneer/homebrew/application';
import { UsingEntryName } from '@pioneer/homebrew/domain';
import { contentEntries } from '@pioneer/rules/infrastructure';
import type { ContentEntry, ContentPackId } from '@pioneer/rules/sdk';
import { eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/** A uuid held as a string value of a JSON document; an object key (a uuid followed by a colon) is not a reference. */
const REFERENCED_UUID = /"(?<id>[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12})"(?!:)/giu;

/** Whether any string in the entry's JSON is one of `ids`: an entry references another by its id wherever it does. */
function mentionsAny(entry: ContentEntry, ids: ReadonlySet<string>): boolean {
  return JSON.stringify(entry)
    .matchAll(REFERENCED_UUID)
    .some((found) => ids.has(found.groups?.['id']?.toLowerCase() ?? ''));
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
