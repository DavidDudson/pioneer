import { TestBed } from '@angular/core/testing';
import {
  AncestryId,
  ContentKind,
  contentId,
  ContentText,
  PackId,
  packContentsFromFiles,
  Slug,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { IDLE_SCHEDULER } from '@pioneer/shared/web';
import { describe, expect, it } from 'vitest';

import { ContentLoader } from './content-loader';
import { provideContentTesting, TestContentDelivery } from './testing';

const PACK = PackId.parse('homebrew');
const packFile = { id: PACK, title: 'Homebrew', publisher: 'Someone', license: 'homebrew' };
const idOf = (slug: string): string => contentId(PACK, Slug.parse(slug));

function entry(kind: string, slug: string, data: object): object {
  return {
    id: idOf(slug),
    pack: PACK,
    kind,
    slug,
    name: `${slug} name`,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    data,
  };
}

const ancestry = entry('ancestry', 'lizardfolk', {
  hitPoints: 8,
  size: 'medium',
  speed: 25,
  boosts: [['str'], ['wis']],
  flaws: ['int'],
  languages: [idOf('common')],
  additionalLanguages: { count: 0, options: [] },
  reach: 5,
});
const common = entry('language', 'common', {});
const contents: PackContents = packContentsFromFiles(packFile, [[ancestry, common]]);
const packs: readonly PackContentsLoader[] = [{ id: PACK, load: async (): Promise<PackContents> => contents }];

interface Loaded {
  readonly loader: ContentLoader;
  readonly delivery: TestContentDelivery;
  /** Runs the work scheduled for idle. */
  readonly idle: () => void;
}

function load(): Loaded {
  const delivery = new TestContentDelivery(packs);
  const waiting: (() => void)[] = [];
  TestBed.configureTestingModule({
    providers: [
      ...provideContentTesting(delivery),
      {
        provide: IDLE_SCHEDULER,
        useValue: (task: () => void): void => {
          waiting.push(task);
        },
      },
    ],
  });
  const idle = (): void => {
    for (const task of waiting.splice(0)) {
      task();
    }
  };
  return { loader: TestBed.inject(ContentLoader), delivery, idle };
}

/** The kinds `requests` fetched bundles of, in order. */
function kindsFetched(requests: readonly string[]): readonly string[] {
  return requests.flatMap((request) => /\/(?<kind>[a-z-]+)\.mech\./u.exec(request)?.groups?.['kind'] ?? []);
}

describe(ContentLoader, () => {
  it('builds a registry of the kinds asked for', async () => {
    const { loader } = load();

    const registry = await loader.registry([ContentKind.Ancestry]);

    const lizardfolk = registry.ancestry(AncestryId.parse(idOf('lizardfolk')));
    expect(lizardfolk?.definition.name).toBe(ContentText.parse('lizardfolk name'));
    expect(lizardfolk?.pack.manifest.title).toBe(ContentText.parse('Homebrew'));
  });

  it('fetches only the kinds asked for', async () => {
    const { loader, delivery } = load();

    await loader.registry([ContentKind.Ancestry]);

    expect(kindsFetched(delivery.requests)).toStrictEqual(['ancestry']);
  });

  it('prefetches the likely next kinds when idle', async () => {
    const { loader, delivery, idle } = load();
    await loader.registry([ContentKind.Ancestry]);

    idle();

    await expect.poll(() => kindsFetched(delivery.requests)).toStrictEqual(['ancestry', 'language']);
  });

  it('a later registry of a prefetched kind needs no request', async () => {
    const { loader, delivery, idle } = load();
    await loader.registry([ContentKind.Ancestry]);
    idle();
    await expect.poll(() => kindsFetched(delivery.requests)).toHaveLength(2);
    const before = delivery.requests.length;

    const registry = await loader.registry([ContentKind.Language]);

    expect(registry.packs[0]?.otherEntries.map((language) => language.slug)).toStrictEqual(['common']);
    expect(delivery.requests).toHaveLength(before);
  });
});
