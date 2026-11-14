import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { CharacterCount, CharacterPage, PageNumber, PageSize } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { characterRoutes } from '../../character.routes';
import {
  PREBUILD_TIMEOUT,
  prebuildServerStateTesting,
  provideServerStateTesting,
} from '../../testing/provide-server-state-testing';

function present<TValue>(value: TValue | null | undefined): TValue {
  if (value === null || value === undefined) {
    throw new Error('Expected element to be rendered');
  }
  return value;
}

const PAGE_SIZE = PageSize.parse(24);

/** The wire form of a page of `names` characters out of `total`, as the API answers. */
function pageOf(names: readonly string[], total: number, page = 1): object {
  const items = names.map((name) => new CharacterBuilder().named(name).build());
  return z.encode(CharacterPage, {
    items,
    total: CharacterCount.parse(total),
    page: PageNumber.parse(page),
    pageSize: PAGE_SIZE,
  });
}

async function open(address = '/characters', answer: object = pageOf([], 0)): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create(address);
  http.expectOne((request) => request.url.startsWith('/api/characters')).flush(answer);
  await harness.fixture.whenStable();
  const root = present(harness.routeNativeElement);
  // The query answers after the flush: wait for the loading skeletons to give way to the page.
  await vi.waitFor(() => {
    harness.detectChanges();
    expect(root.querySelector('fr-skeleton')).toBeNull();
  });
  return root;
}

/** The request the list made on opening `address`, answered with an empty page. */
async function requestFor(address: string): Promise<URL> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  await RouterTestingHarness.create(address);
  const request = http.expectOne((each) => each.url.startsWith('/api/characters'));
  request.flush(pageOf([], 0));
  return new URL(request.request.urlWithParams, 'http://localhost');
}

describe('CharacterListPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('starts with a Create character button that opens the creation choices', async () => {
    const root = await open();
    const first = present(root.querySelector('fr-page-body a'));
    expect(first.textContent).toContain('Create character');
    expect(first.getAttribute('href')).toBe('/characters/new');
  });

  it('keeps no inline create form, import or generate links', async () => {
    const root = await open();
    expect(root.querySelector('form')).toBeNull();
    const hrefs = [...root.querySelectorAll('a')].map((anchor) => anchor.getAttribute('href'));
    expect(hrefs).toStrictEqual(['/characters/new']);
  });

  it('lists the characters on the page with where it is among the pages', async () => {
    const root = await open('/characters', pageOf(['Amiri', 'Kyra'], 50));
    expect(root.textContent).toContain('Amiri');
    expect(root.textContent).toContain('Kyra');
    expect(root.textContent).toContain('Page 1 of 3, 50 characters');
    const [previous, next] = [...root.querySelectorAll('nav fr-button button, [role="navigation"] button')];
    expect(previous?.hasAttribute('disabled')).toBe(true);
    expect(next?.hasAttribute('disabled')).toBe(false);
  });

  it('opens the page and filters its address holds', async () => {
    const url = await requestFor('/characters?page=2&minLevel=3&maxLevel=9&name=kyr');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      page: '2',
      minLevel: '3',
      maxLevel: '9',
      name: 'kyr',
    });
  });

  it('ignores an address value that does not read', async () => {
    const url = await requestFor('/characters?page=next&minLevel=40&classId=fighter');
    const asked = Object.fromEntries(url.searchParams);
    expect(asked).toMatchObject({ page: '1' });
    expect(asked).not.toHaveProperty('minLevel');
    expect(asked).not.toHaveProperty('classId');
  });

  it('offers to clear the filters when none match', async () => {
    const root = await open('/characters?minLevel=19', pageOf([], 0));
    expect(root.textContent).toContain('No characters match these filters.');
    expect(root.textContent).toContain('Clear filters');
  });

  it('shows no filter to clear on an empty, unfiltered list', async () => {
    const root = await open();
    expect(root.textContent).not.toContain('Clear filters');
  });
});
