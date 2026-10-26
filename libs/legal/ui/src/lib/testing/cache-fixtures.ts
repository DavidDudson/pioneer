import { signal } from '@angular/core';
import type { AsyncQuery } from '@pioneer/frontier';
import { BookLabel, BundleFile, PackId } from '@pioneer/rules/sdk';

import type { CachePack } from '../cache-pack';

const PLAYER_CORE = PackId.parse('player-core');
const CORE_RULES = PackId.parse('core-rules');
const MECHANICS_BYTES = 1_500_000;
const NAMES_BYTES = 2500;
const PACK_BYTES = 300;
const ORIGIN = 'https://pioneer.example/api/content/bundles';

function file(pack: PackId, name: string, bytes: number): CachePack['files'][number] {
  return { file: BundleFile.parse(name), bytes, url: `${ORIGIN}/${pack}/${name}` };
}

/** An imported pack: titled by its book, from a Foundry release, with three bundles. */
export const PLAYER_CORE_CACHE: CachePack = {
  id: PLAYER_CORE,
  titleKey: BookLabel.parse('rules.book.title.playerCore'),
  release: 'pf2e-8.6.0',
  bytes: MECHANICS_BYTES + NAMES_BYTES + PACK_BYTES,
  files: [
    file(PLAYER_CORE, 'ancestry.mech.0123456789abcdef.json', MECHANICS_BYTES),
    file(PLAYER_CORE, 'ancestry.names.en.fedcba9876543210.json', NAMES_BYTES),
    file(PLAYER_CORE, 'pack.0000000000000001.json', PACK_BYTES),
  ],
};

/** A pack with no book and no sizes, as an older build's manifest lists it. */
export const CORE_RULES_CACHE: CachePack = {
  id: CORE_RULES,
  titleKey: undefined,
  release: undefined,
  bytes: 0,
  files: [],
};

/** A query that has loaded `data`. */
export function loaded<TData>(data: TData): AsyncQuery<TData> {
  return { data: signal(data), error: signal(undefined), isPending: () => false, isError: () => false };
}

/** A query still waiting for its first answer. */
export function stillLoading<TData>(): AsyncQuery<TData> {
  return { data: signal(undefined), error: signal(undefined), isPending: () => true, isError: () => false };
}

/** A query whose request failed. */
export function failed<TData>(): AsyncQuery<TData> {
  return {
    data: signal(undefined),
    error: signal(new Error('Server Error')),
    isPending: () => false,
    isError: () => true,
  };
}
