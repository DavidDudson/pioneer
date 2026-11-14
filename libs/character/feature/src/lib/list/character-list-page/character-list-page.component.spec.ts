import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { beforeAll, describe, expect, it } from 'vitest';

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

async function open(): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const harness = await RouterTestingHarness.create('/characters');
  http.expectOne('/api/characters').flush([]);
  await harness.fixture.whenStable();
  return present(harness.routeNativeElement);
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
});
