/** Merisiel's sheet in a routed page, for the sheet page specs. */
import { HttpTestingController } from '@angular/common/http/testing';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterId } from '@pioneer/character/domain';
import { frontierMessages } from '@pioneer/frontier';
import { contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';
import { provideI18n } from '@pioneer/shared/web';
import { expect, onTestFinished, vi } from 'vitest';

import { characterRoutes } from '../character.routes';
import { provideServerStateTesting } from './provide-server-state-testing';

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
    },
  },
  level: 1,
  createdAt: '2026-10-07T10:00:00.000Z',
  updatedAt: '2026-10-07T10:00:00.000Z',
};

export const ELF = contentId(PackId.parse('player-core'), EntrySlug.parse('ancestry:elf'));

/** The slots the server read for Merisiel: a filled ancestry, a planned boost, and a boost it no longer offers. */
export const MERISIEL_SLOTS = [
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
];

/** Merisiel as the server sends her sheet. */
export function sheetOf(character: object, slots: readonly object[] = MERISIEL_SLOTS): object {
  return { character, slots };
}

/** The server's answer to an edit of Merisiel: her sheet, and the picks the edit cleared. */
export function patchedOf(character: object, slots: readonly object[], cleared: readonly object[] = []): object {
  return { character, slots, cleared };
}

export function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

export interface OpenSheet {
  readonly harness: RouterTestingHarness;
  readonly root: HTMLElement;
}

/** Opens Merisiel's sheet in the document, so focus can move, and waits until she has loaded. */
export async function openSheet(): Promise<OpenSheet> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(`/characters/${id}`);
  const host: unknown = harness.fixture.nativeElement;
  if (!(host instanceof HTMLElement)) {
    throw new TypeError('Expected the harness to render an element');
  }
  document.body.append(host);
  onTestFinished(() => {
    host.remove();
  });
  await vi.waitFor(() => {
    TestBed.inject(HttpTestingController).expectOne(`/api/characters/${id}`).flush(sheetOf(MERISIEL));
  });
  const root = present(harness.routeNativeElement);
  await vi.waitFor(async () => {
    // Through the application, not `harness.detectChanges()`, so render hooks (roving focus) run as in the app.
    await TestBed.inject(ApplicationRef).whenStable();
    expect(root.textContent).toContain('Merisiel');
  });
  return { harness, root };
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
