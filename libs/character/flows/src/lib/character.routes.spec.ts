import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { characterMessages as messages, CharacterStore } from '@pioneer/character/feature';
import { StubPage } from '@pioneer/character/feature/testing';
import { frontierMessages, HeaderCrumbs } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import * as z from 'zod';

import { characterRoutes } from './character.routes';

/** A route with children keeps them stubbed, an absolute redirect stays one, and any other becomes the stub page. */
function target(route: Route): Route {
  if (route.children !== undefined) {
    return { children: stubbed(route.children) };
  }

  const redirect = z.string().startsWith('/').safeParse(route.redirectTo);

  if (redirect.success) {
    return { redirectTo: redirect.data, pathMatch: route.pathMatch ?? 'prefix' };
  }

  return { component: StubPage };
}

/** The real routes with every page replaced by `StubPage` and the store by one that holds the open character. */
function stubbed(routes: readonly Route[]): Route[] {
  return routes.map((route): Route => {
    const providers = route.providers?.map((provider) =>
      provider === CharacterStore
        ? { provide: CharacterStore, useValue: { selected: signal({ name: 'Briar Rose' }) } }
        : provider,
    );

    const kept: Route = {};

    if (route.path !== undefined) {
      kept.path = route.path;
    }

    if (route.data !== undefined) {
      kept.data = route.data;
    }

    if (providers !== undefined) {
      kept.providers = providers;
    }

    return { ...kept, ...target(route) };
  });
}

async function open(url: string): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: stubbed(characterRoutes) }]),
      provideI18n({ en: async () => ({ ...frontierMessages, character: messages }) }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient()),
    ],
  });
  await RouterTestingHarness.create(url);
}

/** The trail the shell's header shows. */
const trailOf = (): (string | undefined)[] =>
  TestBed.inject(HeaderCrumbs)
    .trail()
    .map(({ label }) => label);

/** Where the trail's links go. */
const hrefsOf = (): string[] =>
  TestBed.inject(HeaderCrumbs)
    .trail()
    .flatMap(({ to }): string[] => {
      const href = z.string().safeParse(to);

      return href.success ? [href.data] : [];
    });

describe('character routes', () => {
  it('trails Characters, the character and the sheet tab, which is in the URL', async () => {
    await open('/characters/briar-rose/encounter');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Briar Rose', 'Encounter']);
    });
    expect(hrefsOf()).toStrictEqual(['/characters', '/characters/briar-rose']);
  });

  it('trails the import hub under the creation choices', async () => {
    await open('/characters/new/import');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Import']);
    });
    expect(hrefsOf()).toStrictEqual(['/characters', '/characters/new']);
  });

  it('trails the Pathbuilder page under the import hub', async () => {
    await open('/characters/new/import/pathbuilder');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Import', 'Import from Pathbuilder']);
    });
  });

  it('trails the backup page under the import hub', async () => {
    await open('/characters/new/import/backup');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Import', 'Import from Pioneer JSON']);
    });
  });

  it('trails the creation choices under Characters', async () => {
    await open('/characters/new');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character']);
    });
    expect(hrefsOf()).toStrictEqual(['/characters']);
  });

  it('trails the create page under the creation choices', async () => {
    await open('/characters/new/create');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Create']);
    });
    expect(hrefsOf()).toStrictEqual(['/characters', '/characters/new']);
  });

  it('sends the old Pathbuilder and Pioneer import URLs to the import hub pages', async () => {
    await open('/characters/import/pathbuilder');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Import', 'Import from Pathbuilder']);
    });
    TestBed.resetTestingModule();

    await open('/characters/import/pioneer');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Characters', 'Create a character', 'Import', 'Import from Pioneer JSON']);
    });
  });
});
