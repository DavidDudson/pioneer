import { ContentId, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import type { KitLine } from '../shop-offer';

/** A kit line for the item named `name`, holding `contents` when it is a container. */
export function kitLine(name: string, quantity: number, contents: readonly KitLine[] = []): KitLine {
  const slug = EntrySlug.parse(`equipment:${name.toLowerCase().replaceAll(' ', '-')}`);
  return { item: ContentId.parse(contentId(PackId.parse('player-core'), slug)), name, quantity, contents };
}
