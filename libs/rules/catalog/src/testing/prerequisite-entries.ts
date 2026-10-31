import { ContentEntry, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

const PACK = 'player-core';

/** A Player Core entry of `kind` with `data`. */
export function entry(name: string, kind: string, data: object): ContentEntry {
  const slug = `${kind}:${name
    .toLowerCase()
    .replaceAll(/[^a-z]+/gu, '-')
    .replace(/-$/u, '')}`;
  return ContentEntry.parse({
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
    ...(kind === 'statistic' ? {} : { level: 1 }),
    data,
  });
}

export const skill = (name: string, selector: string): ContentEntry =>
  entry(name, 'statistic', { selector, domains: ['skill-check'], base: '@attr.str', kind: 'check' });
