/** Merisiel's sheet in a routed page, for the sheet page specs. */
import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId, SheetMode } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { PackContentsLoader } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { QueryClient } from '@tanstack/angular-query-experimental';
import { beforeAll, expect, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../character.routes';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from './provide-server-state-testing';

/**
 * Loads the sheet page's chunk (the page, the engine and the tabs under it) before the first test of each spec file.
 * The route imports it lazily, and the first import takes seconds, which landed in whichever test ran first and
 * pushed it past its own timeout on a loaded machine.
 */
beforeAll(async () => {
  await import('../sheet/character-sheet-page/character-sheet-page.component');
}, PREBUILD_TIMEOUT);
/** How long a sheet may take to open: its registries build from the official packs, slow on a busy CI runner. */
const SHEET_OPEN_TIMEOUT = 20_000;

/** How often a read waited for is tried again, in ms: the default 50 ms, chained over a page's reads, was most of an open. */
const POLL_INTERVAL = 5;

export const id = CharacterId.parse('0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10');

export const HUMAN = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:human'));

export const MERISIEL = {
  id,
  version: 1,
  ownerId: '8f6d2c1a-0b3e-4f5a-9c7d-1e2f3a4b5c6d',
  name: 'Merisiel',
  build: {
    choices: {
      ancestry: contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf')),
      'boost:1:ancestry:2': 'con',
      'boost:1:free:0': 'dex',
      'boost:1:free:1': 'con',
      'boost:1:free:2': 'wis',
      'flaw:1:ancestry:0': 'int',
    },
  },
  level: 1,
  createdAt: '2026-10-07T10:00:00.000Z',
  updatedAt: '2026-10-07T10:00:00.000Z',
};

const ELF = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf'));

/**
 * The slots the server read for Merisiel: a filled ancestry, a planned boost, a boost it no longer offers and a
 * voluntary flaw.
 */
const MERISIEL_SLOTS = [
  {
    status: 'filled',
    key: 'ancestry',
    subject: { kind: 'root', content: 'ancestry' },
    selection: ELF,
    selectionName: 'Elf',
  },
  { status: 'open', key: 'background', subject: { kind: 'root', content: 'background' } },
  {
    status: 'invalid',
    key: 'boost:1:ancestry:2',
    subject: { kind: 'boost', source: 'ancestry', level: 1 },
    selection: 'con',
    reason: { key: 'rules.choices.invalid.notOffered' },
  },
  {
    status: 'planned',
    key: 'boost:5:free:0',
    subject: { kind: 'boost', source: 'free', level: 5 },
    level: 5,
    selection: 'str',
  },
  { status: 'planned', key: 'boost:5:free:1', subject: { kind: 'boost', source: 'free', level: 5 }, level: 5 },
  { status: 'filled', key: 'flaw:1:ancestry:0', subject: { kind: 'flaw' }, selection: 'int' },
];

/** Merisiel as the server sends her sheet. */
/** A sheet's languages before an ancestry grants any: none known, none to add. */
const NO_LANGUAGES = { known: [], open: 0 } as const;

function sheetOf(
  character: object,
  { slots = MERISIEL_SLOTS, languages = NO_LANGUAGES, deity }: SheetOptions = {},
): object {
  return { character, slots, languages, ...(deity === undefined ? {} : { deity }) };
}

/** Opens a sheet at the character's own address, with no tab named. */
export const NO_TAB = 'none';

/** What else a sheet opens with: the slots the server read, and the content packs served. */
export interface SheetOptions {
  readonly slots?: readonly object[];
  /** The languages the server read; none by default. */
  readonly languages?: object;
  /** The deity the server read; none by default. */
  readonly deity?: object;
  readonly packs?: readonly PackContentsLoader[];
  /** The tab to open, Plan by default; `NO_TAB` opens the character's own address, which opens the last tab. */
  readonly tab?: SheetMode | typeof NO_TAB;
  /** The play state the server read; undamaged, at revision 1, by default. */
  readonly play?: object;
  /** The sections where the server has the user showing grant-only feats; none by default. */
  readonly featDisplay?: object;
  /** The packs the server has the character using; only the owner's choice of none by default. */
  readonly characterPacks?: object;
}

/** The packs of a character that has enabled none, which its owner may change. */
const NO_CHARACTER_PACKS = { decidedBy: 'character', manageable: true, enabled: [], candidates: [] };

/** The play state the server holds, at `revision`. */
export function playOf(damage: number, temp: number, revision = 1): object {
  return { revision, play: { hp: { damage, temp } } };
}

/** The play state of a character at 0 Hit Points with the death track's `track` conditions, at `revision`. */
export function deathOf(track: object, revision = 1): object {
  return { revision, play: { hp: { damage: 15, temp: 0 }, ...track } };
}

/**
 * Answers the sheet's read of its play state, made once the character is selected; left unanswered it keeps the
 * application unstable, so a spec waiting on it never settles.
 */
export async function answerPlayRead(play: object = playOf(0, 0)): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${id}/play` })
        .flush(play);
    },
    { interval: POLL_INTERVAL },
  );
}

/**
 * Answers the sheet's read of the character's packs, which the content registry waits for on every tab; left
 * unanswered the registry never loads.
 */
export async function answerPacksRead(packs: object = NO_CHARACTER_PACKS): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController)
        .expectOne({ method: 'GET', url: `/api/characters/${id}/packs` })
        .flush(packs);
    },
    { interval: POLL_INTERVAL },
  );
}

/** The server's answer to an edit of Merisiel: her sheet, and the picks the edit cleared. */
export function patchedOf(character: object, slots: readonly object[], cleared: readonly object[] = []): object {
  return { character, slots, cleared, languages: NO_LANGUAGES };
}

export function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

function sheetUrl(tab: SheetMode | typeof NO_TAB = SheetMode.Plan): string {
  return tab === NO_TAB ? `/characters/${id}` : `/characters/${id}/${tab}`;
}

/** The harness behind each sheet `openSheet` rendered, by its root. */
const HARNESSES = new WeakMap<HTMLElement, RouterTestingHarness>();

export interface OpenSheet {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

/** Answers the sheet's reads of the character, its play state and its packs. */
async function answerReads(character: object, options: SheetOptions): Promise<void> {
  await vi.waitFor(
    () => {
      TestBed.inject(HttpTestingController).expectOne(`/api/characters/${id}`).flush(sheetOf(character, options));
    },
    { interval: POLL_INTERVAL },
  );
  await answerPlayRead(options.play);
  // Every tab reads the character's packs: the content registry waits for them to build over the right ones.
  await answerPacksRead(options.characterPacks);
}

/**
 * Opens Merisiel's sheet (or `character`'s) at a tab in the document, so focus can move, and waits until it has loaded.
 * The tab it last had is never answered, so opening a tab never remembers it.
 */
export async function openSheet(character: object = MERISIEL, options: SheetOptions = {}): Promise<OpenSheet> {
  await prebuildServerStateTesting([], options.packs);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting([], options.packs),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(sheetUrl(options.tab));
  const host: unknown = harness.fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('Expected the harness to render an element');
  }
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  await answerReads(character, options);
  const root = present(harness.routeNativeElement);
  await vi.waitFor(
    async () => {
      // The feats section reads the user''s feat filter once it renders; other tabs never ask.
      for (const read of TestBed.inject(HttpTestingController).match(`/api/characters/${id}/feat-display`)) {
        read.flush(options.featDisplay ?? { showGrantOnly: [] });
      }
      // Through the application, not `harness.detectChanges()`, so render hooks (roving focus) run as in the app.
      await TestBed.inject(ApplicationRef).whenStable();
      expect(root.textContent).toContain('Merisiel');
      // The content registries build once the packs are known; a spec holding an element before then holds a placeholder.
      expect(TestBed.inject(QueryClient).isFetching({ queryKey: ['content'] })).toBe(0);
    },
    { timeout: SHEET_OPEN_TIMEOUT, interval: POLL_INTERVAL },
  );
  return remembered({ harness, root });
}

/** `opened`, with its harness findable by its root. */
function remembered(opened: OpenSheet): OpenSheet {
  HARNESSES.set(opened.root, opened.harness);
  return opened;
}

/** The harness that rendered `root`, for a spec that reaches a component the page rendered. */
export function harnessOf(root: HTMLElement): RouterTestingHarness {
  const harness = HARNESSES.get(root);
  if (harness === undefined) {
    throw new Error('Expected a root that openSheet rendered');
  }
  return harness;
}

/** Opens a sheet as `openSheet` does. */
export type SheetOpener = (character?: object, options?: SheetOptions) => Promise<OpenSheet>;

/** `openSheet` at `tab` unless told otherwise, for a spec whose sections are on one tab. */
export function openerAt(tab: SheetMode): SheetOpener {
  return async (character = MERISIEL, options = {}) => openSheet(character, { tab, ...options });
}
