import type { ContentId, ContentPackId } from '@pioneer/rules/sdk';

/**
 * Port to the content tables: which homebrew packs define the entries with these ids. Rules owns the tables, so the
 * adapter lives in the composition root. An id that is no entry of a homebrew pack in force is left out.
 */
export abstract class PackLookup {
  public abstract packsOf(entryIds: readonly ContentId[]): Promise<readonly ContentPackId[]>;
}
