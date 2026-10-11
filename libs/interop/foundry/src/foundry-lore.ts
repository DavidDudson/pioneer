import { Selector } from '@pioneer/rules/sdk';

import { slugify } from './foundry-slug';

/*
 * Lore skills, which Foundry names in words (`Scribing Lore`) or by slug (`scribing-lore`) and Pioneer keys by topic:
 * the selector `skill:lore:<topic>` and the statistic entry `statistic:<topic>-lore` (rules-engine.md, "Statistics
 * are content").
 */

const LORE_NAME = /\s+lore$/iu;
const LORE_SLUG = /^(?<topic>.+)-lore$/u;

/** A Lore's topic from its name, less the word Lore its selector already says: `Scribing Lore` to `scribing`. */
export function loreTopic(name: string): string {
  return slugify(name.replace(LORE_NAME, ''));
}

/** The topic of a Foundry statistic slug that names a Lore (`warfare-lore` to `warfare`), else undefined. */
export function loreSlugTopic(slug: string): string | undefined {
  return LORE_SLUG.exec(slug)?.groups?.['topic'];
}

/** A Lore's selector (`skill:lore:scribing`), or undefined when the topic makes no selector. */
export function loreSelector(topic: string): Selector | undefined {
  return Selector.safeParse(`skill:lore:${topic}`).data;
}
