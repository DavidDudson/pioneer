/**
 * The staff pass over committed packs (play-and-campaigns.md, "Staves and charged items"; ADR-0031): each staff whose
 * printed spell list the matcher can read gets its typed `staff` spells. Entries the pass doesn't change keep their
 * JSON as is.
 */
import { ContentEntry, ContentEntryFile, contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentKey, StaffSpells } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** `entry` with `staff` on its data; a kind that holds no staff is returned as it is. */
function withStaff(entry: ContentEntry, staff: StaffSpells): ContentEntry {
  if (entry.kind === ContentKind.Weapon || entry.kind === ContentKind.Equipment) {
    return { ...entry, data: { ...entry.data, staff } };
  }
  return entry;
}

/**
 * A `<kind>.json` file with each matched staff's spells set, or undefined when no entry in it matched. Only matched
 * entries are re-encoded; the rest are the file's own JSON.
 */
export function enrichStaffFile(
  file: readonly unknown[],
  matches: ReadonlyMap<ContentKey, StaffSpells>,
): readonly unknown[] | undefined {
  const entries = ContentEntryFile.parse(file);
  const enriched = file.map((json, index) => {
    const entry = entries[index];
    const staff = entry === undefined ? undefined : matches.get(contentKey(entry.pack, entry.slug));
    return entry === undefined || staff === undefined ? json : z.encode(ContentEntry, withStaff(entry, staff));
  });
  const changed = enriched.some((json, index) => json !== file[index]);
  return changed ? enriched : undefined;
}
