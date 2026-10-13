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
import { expect, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../character.routes';
import { prebuildServerStateTesting, provideServerStateTesting } from './provide-server-state-testing';

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
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController)
      .expectOne({ method: 'GET', url: `/api/characters/${id}/play` })
      .flush(play);
  });
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

export interface OpenSheet {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

/** Answers the sheet's read of the character and then of its play state. */
async function answerReads(character: object, options: SheetOptions): Promise<void> {
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController).expectOne(`/api/characters/${id}`).flush(sheetOf(character, options));
  });
  await answerPlayRead(options.play);
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
  await vi.waitFor(async () => {
    // The feats section reads the user''s feat filter once it renders; other tabs never ask.
    for (const read of TestBed.inject(HttpTestingController).match(`/api/characters/${id}/feat-display`)) {
      read.flush(options.featDisplay ?? { showGrantOnly: [] });
    }
    // The packs section reads the character's packs once the Plan tab renders; other tabs never ask.
    for (const read of TestBed.inject(HttpTestingController).match(`/api/characters/${id}/packs`)) {
      read.flush(options.characterPacks ?? NO_CHARACTER_PACKS);
    }
    // Through the application, not `harness.detectChanges()`, so render hooks (roving focus) run as in the app.
    await TestBed.inject(ApplicationRef).whenStable();
    expect(root.textContent).toContain('Merisiel');
  });
  return { harness, root };
}

/** Opens a sheet as `openSheet` does. */
export type SheetOpener = (character?: object, options?: SheetOptions) => Promise<OpenSheet>;

/** `openSheet` at `tab` unless told otherwise, for a spec whose sections are on one tab. */
export function openerAt(tab: SheetMode): SheetOpener {
  return async (character = MERISIEL, options = {}) => openSheet(character, { tab, ...options });
}

/** Opens the ancestry field and picks the option whose label starts with `name`; returns the field. */
export async function pickAncestry(root: HTMLElement, name: string): Promise<HTMLElement> {
  const field = present(
    [...root.querySelectorAll<HTMLElement>('fr-inline-field')].find(
      (each) => each.querySelector('fr-text')?.textContent.trim() === 'Ancestry',
    ),
  );
  present(field.querySelector<HTMLElement>('button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  present(field.querySelector<HTMLElement>('[frInlineEditor] button')).click();
  await TestBed.inject(ApplicationRef).whenStable();
  const option = await vi.waitFor(() =>
    present(
      [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((each) =>
        each.textContent.trim().startsWith(name),
      ),
    ),
  );
  option.click();
  return field;
}
