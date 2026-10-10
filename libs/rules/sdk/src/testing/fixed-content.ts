import type { ContentPack } from '../content-pack';
import { ContentRegistry } from '../content-registry';
import type { ContentSource } from '../content-registry';

/** A content source that always serves one registry over `packs`, for use cases tested without a database. */
export function fixedContent(...packs: readonly ContentPack[]): ContentSource {
  const content = new ContentRegistry();
  for (const pack of packs) {
    content.register(pack);
  }
  return { registry: async () => content };
}
