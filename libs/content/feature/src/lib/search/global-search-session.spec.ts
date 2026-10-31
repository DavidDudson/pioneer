import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CONTENT_SCOPE } from '@pioneer/rules/data-access';
import { prebuildContentTesting, provideContentTesting, TestContentDelivery } from '@pioneer/rules/data-access/testing';
import { ContentLicense, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { ContentPack, PackContentsLoader } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { IDLE_SCHEDULER, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { GlobalSearchIndex } from './global-search-index';
import { GlobalSearchSession } from './global-search-session';

const PACK: ContentPack = new ContentPackBuilder()
  .withId('search-session-test')
  .withFeat('power-attack', { level: 1, traits: ['fighter', 'flourish'] })
  .withFeat('attack-of-opportunity', { level: 1, traits: [] })
  .withFeat('toughness', {
    level: 1,
    traits: [],
    description: [{ type: 'paragraph', content: [{ type: 'text', text: 'Shrug off an attack.' }] }],
  })
  .build();
const LOADER: PackContentsLoader = {
  id: PACK.id,
  load: async () => packContentsFromFiles(PACK.manifest, [PACK.otherEntries]),
};
const LEGACY_PACK: ContentPack = new ContentPackBuilder()
  .withId('search-session-legacy')
  .withLicense(ContentLicense.Ogl)
  .withFeat('sudden-charge', { level: 1, traits: [] })
  .build();
const LEGACY_LOADER: PackContentsLoader = {
  id: LEGACY_PACK.id,
  load: async () => packContentsFromFiles(LEGACY_PACK.manifest, [LEGACY_PACK.otherEntries]),
};

const SHELL_MESSAGES = {
  'shell.search.kind.feat': 'Feat',
  'shell.search.level': 'Level {{level}}',
  'contentBrowser.legacy.label': 'Legacy',
};
const NAMES_FOR_ATTACK = ['Attack-of-opportunity', 'Power-attack'];

interface Started {
  readonly session: GlobalSearchSession;
  readonly delivery: TestContentDelivery;
}

function start(legacy = true): Started {
  const delivery = new TestContentDelivery([LOADER, LEGACY_LOADER]);
  TestBed.configureTestingModule({
    providers: [
      provideI18n({ en: async () => SHELL_MESSAGES }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      // Idle is now, so every kind loads as soon as the box is used.
      {
        provide: IDLE_SCHEDULER,
        useValue: (task: () => void): void => {
          task();
        },
      },
      ...provideContentTesting(delivery),
      { provide: CONTENT_SCOPE, useValue: signal({ homebrew: [], legacy, ready: true }) },
      GlobalSearchIndex,
      GlobalSearchSession,
    ],
  });
  return { session: TestBed.inject(GlobalSearchSession), delivery };
}

const labels = ({ session }: Started): string[] => session.options().map((option) => option.label);

/** Waits for the names to be matched in the kinds loaded so far. */
async function listsNames(started: Started, expected: readonly string[]): Promise<void> {
  await vi.waitFor(() => {
    expect(labels(started)).toStrictEqual(expected);
  });
}

describe(GlobalSearchSession, () => {
  beforeAll(async () => {
    await prebuildContentTesting([LOADER, LEGACY_LOADER]);
  }, 60_000);

  it('lists nothing before anything is typed', () => {
    const started = start();

    expect(labels(started)).toStrictEqual([]);
    expect(started.session.words()).toBe('');
    expect(started.session.loading()).toBe(false);
  });

  it('matches names as the words are typed, without asking the server', async () => {
    const started = start();

    started.session.type('attack');

    await listsNames(started, NAMES_FOR_ATTACK);
    expect(started.session.words()).toBe('attack');
    expect(started.delivery.requests).not.toContain('search');
    const tagged = started.session.options().map((option) => option.tags?.map((tag) => tag.label));
    expect(tagged).toStrictEqual([
      ['Feat', 'Level 1'],
      ['Feat', 'Level 1', 'fighter', 'flourish'],
    ]);
  });

  it('tags an entry of a pre-remaster pack as legacy', async () => {
    const started = start();

    started.session.type('sudden');

    await listsNames(started, ['Sudden-charge']);
    expect(started.session.options().map((option) => option.tags?.map((tag) => tag.label))).toStrictEqual([
      ['Feat', 'Legacy', 'Level 1'],
    ]);
  });

  it('leaves out an entry of a pre-remaster pack while legacy content is off', async () => {
    const started = start(false);

    started.session.type('attack');
    await listsNames(started, NAMES_FOR_ATTACK);

    started.session.type('sudden');

    await listsNames(started, []);
    expect(started.session.words()).toBe('sudden');
  });

  it('adds the server matches below the names once typing goes quiet, and never moves the ones listed', async () => {
    const started = start();
    started.session.type('attack');
    await listsNames(started, NAMES_FOR_ATTACK);

    started.session.search('attack');

    await listsNames(started, [...NAMES_FOR_ATTACK, 'Toughness']);
    expect(started.delivery.requests).toContain('search');
  });

  it('drops the server matches of words that have been typed over since', async () => {
    const started = start();
    started.session.restore('attack');
    await listsNames(started, [...NAMES_FOR_ATTACK, 'Toughness']);

    started.session.type('attack-of');

    await listsNames(started, ['Attack-of-opportunity']);
    expect(started.session.words()).toBe('attack-of');
  });

  it('asks the server at once for words restored from a link', async () => {
    const started = start();

    started.session.restore('shrug');

    await listsNames(started, ['Toughness']);
    expect(started.session.words()).toBe('shrug');
    expect(started.delivery.requests).toContain('search');
  });

  it('starts over when cleared', async () => {
    const started = start();
    started.session.restore('attack');
    await listsNames(started, [...NAMES_FOR_ATTACK, 'Toughness']);

    started.session.clear();

    await listsNames(started, []);
    expect(started.session.words()).toBe('');
  });

  it('looks up an entry once its kind has loaded', async () => {
    const started = start();
    started.session.type('toughness');
    await listsNames(started, ['Toughness']);
    const [option] = started.session.options();

    expect(started.session.entry(option?.value)?.name).toBe('Toughness');
    expect(started.session.entry(undefined)).toBeUndefined();
  });
});
