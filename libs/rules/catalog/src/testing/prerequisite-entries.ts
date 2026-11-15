import { ContentEntry, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { JsonObject } from '@pioneer/rules/sdk/testing';

const PACK = 'player-core';

/** A Player Core entry of `kind` with `data`. */
export function entry(name: string, kind: string, data: JsonObject): ContentEntry {
  const slug = `${kind}:${name
    .toLowerCase()
    .replaceAll(/[^a-z]+/gu, '-')
    .replace(/-$/u, '')}`;

  const fields = {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    kind,
    data,
  };

  return ContentEntry.parse(kind === 'statistic' ? fields : { ...fields, level: 1 });
}

export const skill = (name: string, selector: string): ContentEntry =>
  entry(name, 'statistic', { selector, domains: ['skill-check'], base: '@attr.str', kind: 'check' });
