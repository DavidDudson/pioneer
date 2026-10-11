import { slotContent } from '@pioneer/character/domain';
import type { SlotContent } from '@pioneer/character/domain';
import type { ContentRegistry } from '@pioneer/rules/sdk';

/** Slot content by registry: a loaded registry never changes, so its reads (and their resolved grants) are shared. */
const CONTENT = new WeakMap<ContentRegistry, SlotContent>();

/** The slot content of a loaded registry, built once, so the sheet's skill reads share resolved grants. */
export function sheetSlotContent(registry: ContentRegistry): SlotContent {
  const content = CONTENT.get(registry) ?? slotContent(registry);
  CONTENT.set(registry, content);
  return content;
}
