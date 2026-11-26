import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ContentEntry,
  contentId,
  ContentKind,
  ContentText,
  EntrySlug,
  packContentsFromFiles,
  PackId,
  RichText,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentLocale } from '@pioneer/shared/kernel';
import { CONTENT_LOCALE, IDLE_SCHEDULER } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { ContentLoader } from './content-loader';
import { CONTENT_PACK_CACHE } from './content-pack-cache';
import { MemoryBundleStore } from './memory-bundle-store';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const GERMAN = ContentLocale.parse('de');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
const spoken = [{ type: 'paragraph', content: [{ type: 'text', text: 'Spoken everywhere.' }] }];
const gesprochen = [{ type: 'paragraph', content: [{ type: 'text', text: '\u00DCberall gesprochen.' }] }];

const common = {
  id: contentId(PACK, EntrySlug.parse('language:common')),
  pack: PACK,
  kind: 'language',
  slug: 'language:common',
  name: 'common name',
  rarity: 'common',
  traits: [],
  sources: [{ kind: 'book', book: 'player-core', page: 1 }],
  description: spoken,
  rules: [],
  data: {},
};

const language = ContentEntry.parse(common);
const contents: PackContents = packContentsFromFiles(packFile, [[common]]);
const packs: readonly PackContentsLoader[] = [{ id: PACK, load: async (): Promise<PackContents> => contents }];

/** A loader reading German, and what it was served. */
interface GermanLoader {
  readonly loader: ContentLoader;
  readonly delivery: TestContentDelivery;
}

/** A loader reading German, served the pack with German text for the language only if `translated`. */
function german(translated: boolean): GermanLoader {
  const delivery = new TestContentDelivery(packs);
  TestBed.configureTestingModule({
    providers: [
      ...provideContentTesting(delivery, new MemoryBundleStore()),
      { provide: CONTENT_PACK_CACHE, useValue: new Map() },
      { provide: CONTENT_LOCALE, useValue: signal(GERMAN).asReadonly() },
      { provide: IDLE_SCHEDULER, useValue: (): void => undefined },
    ],
  });
  delivery.translate({
    locale: GERMAN,
    entries: new Map(
      translated
        ? [[language.id, { name: ContentText.parse('Gemeinsprache'), description: RichText.parse(gesprochen) }]]
        : [],
    ),
  });

  return { loader: TestBed.inject(ContentLoader), delivery };
}

function descriptionRequests(requests: readonly string[]): readonly string[] {
  return requests.filter((request) => request.includes('.desc.'));
}

describe('ContentLoader in another content locale', () => {
  it('names entries in the locale, and reads the German manifest', async () => {
    const { loader, delivery } = german(true);

    const registry = await loader.registry([ContentKind.Language]);

    const names = registry.packs.flatMap((pack) => pack.otherEntries.map((entry) => String(entry.name)));
    expect(names).toStrictEqual(['Gemeinsprache']);
    expect(delivery.requests[0]).toBe('manifest');
  });

  it('lazy-loads the locale\u2019s description shard, once', async () => {
    const { loader, delivery } = german(true);

    const first = await loader.description(language);
    const second = await loader.description(language);

    expect(first).toStrictEqual({ text: gesprochen, untranslated: false });
    expect(second).toStrictEqual(first);
    expect(descriptionRequests(delivery.requests)).toHaveLength(1);
    expect(descriptionRequests(delivery.requests)[0]).toContain('.desc.de.');
  });

  it('falls back to the source language per field, marked, never blank', async () => {
    const { loader } = german(false);

    const registry = await loader.registry([ContentKind.Language]);
    const description = await loader.description(language);

    const names = registry.packs.flatMap((pack) => pack.otherEntries.map((entry) => String(entry.name)));
    expect(names).toStrictEqual(['common name']);
    expect(description).toStrictEqual({ text: spoken, untranslated: true });
  });
});
