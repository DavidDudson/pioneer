import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
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

async function open(url: string): Promise<RouterTestingHarness> {
  TestBed.configureTestingModule({
    providers: [
      // Mounted below a parent path like the app does, so absolute navigation would miss.
      provideRouter([{ path: 'characters', children: characterRoutes }], withComponentInputBinding()),
      ...provideServerStateTesting(),
      provideI18n({ en: async () => frontierMessages }),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  return harness;
}

describe('CreateCharacterPage', () => {
  // Loads and bundles the packs once, outside every test's timeout.
  beforeAll(async () => {
    await prebuildServerStateTesting();
  }, PREBUILD_TIMEOUT);

  it('asks for the name first and saves nothing', async () => {
    const harness = await open('/characters/new/create');
    const http = TestBed.inject(HttpTestingController);

    const root = present(harness.routeNativeElement);
    // Text comes from the route's `character` message scope, loaded with the page's code.
    expect(root.textContent).toContain('What is your character called?');
    http.expectNone({ method: 'POST', url: '/api/characters' });
  });

  it('restores the draft from the URL', async () => {
    const harness = await open('/characters/new/create?name=Merisiel&step=3');

    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('Merisiel');
  });

  it('holds a step back until the ones before it are answered', async () => {
    const harness = await open('/characters/new/create?step=4');
    const router = TestBed.inject(Router);

    const root = present(harness.routeNativeElement);
    expect(root.textContent).toContain('What is your character called?');
    expect(router.url).toContain('step=4');
  });
});
