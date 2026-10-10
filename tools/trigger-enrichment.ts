/**
 * The trigger pass over committed packs (play-and-campaigns.md, "Triggered abilities"; ADR-0031): each action whose
 * trigger wording the matcher knows gets its `triggerEvent`. Entries the pass doesn't change keep their JSON as is.
 */
import { ContentEntry, ContentEntryFile, contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentKey, TriggerEvent } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** `entry` with `triggerEvent` on its action. */
function withEvent(entry: ContentEntry, triggerEvent: TriggerEvent): ContentEntry {
  if (entry.kind === ContentKind.Action) {
    return { ...entry, data: { ...entry.data, triggerEvent } };
  }
  if ((entry.kind === ContentKind.Feat || entry.kind === ContentKind.ClassFeature) && entry.data.action !== undefined) {
    return { ...entry, data: { ...entry.data, action: { ...entry.data.action, triggerEvent } } };
  }
  return entry;
}

/**
 * A `<kind>.json` file with each matched entry's event set, or undefined when no entry in it matched. Only matched
 * entries are re-encoded; the rest are the file's own JSON.
 */
export function enrichTriggerFile(
  file: readonly unknown[],
  matches: ReadonlyMap<ContentKey, TriggerEvent>,
): readonly unknown[] | undefined {
  const entries = ContentEntryFile.parse(file);
  let changed = false;
  const enriched = file.map((json, index) => {
    const entry = entries[index];
    const triggerEvent = entry === undefined ? undefined : matches.get(contentKey(entry.pack, entry.slug));
    if (entry === undefined || triggerEvent === undefined) {
      return json;
    }
    changed = true;
    return z.encode(ContentEntry, withEvent(entry, triggerEvent));
  });
  return changed ? enriched : undefined;
}
