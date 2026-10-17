import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import messages from '../i18n/en.json';
import { characterRoutes } from './character.routes';
import { CharacterStore } from './data/character-store';
import { StubPage } from './testing/stub-page.component';

/** The real routes with every page replaced by `StubPage` and the store by one that holds the open character. */
function stubbed(routes: readonly Route[]): Route[] {
  return routes.map((route): Route => {
    const providers = route.providers?.map((provider) =>
      provider === CharacterStore
        ? { provide: CharacterStore, useValue: { selected: signal({ name: 'Briar Rose' }) } }
        : provider,
    );
    return {
      ...(route.path === undefined ? {} : { path: route.path }),
      ...(route.data === undefined ? {} : { data: route.data }),
      ...(providers === undefined ? {} : { providers }),
      ...(route.children === undefined ? { component: StubPage } : { children: stubbed(route.children) }),
    };
  });
}

async function open(url: string): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'characters', children: stubbed(characterRoutes) }]),
      provideI18n({ en: async () => ({ ...frontierMessages, character: messages }) }),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideTanStackQuery(new QueryClient()),
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  const root = harness.routeNativeElement;
  if (root === null) {
    throw new Error('nothing routed');
  }
  return root;
}

function headerOf(root: HTMLElement): Element {
  const header = root.querySelector('fr-page-header');
  if (header === null) {
    throw new Error('no page header rendered');
  }
  return header;
}

/** The trail of the outermost header. */
const trailOf = (root: HTMLElement): string[] =>
  [...headerOf(root).querySelectorAll('nav li')].map((li) => li.textContent.trim());

/** Where the trail's links go. */
const hrefsOf = (root: HTMLElement): (string | null)[] =>
  [...headerOf(root).querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

describe('character routes', () => {
  it('trails Characters, the character and the sheet tab, which is in the URL', async () => {
    const root = await open('/characters/briar-rose/encounter');
    await vi.waitFor(() => {
      expect(trailOf(root)).toStrictEqual(['Characters', 'Briar Rose', 'Encounter']);
    });
    expect(hrefsOf(root)).toStrictEqual(['/characters', '/characters/briar-rose']);
  });

  it('trails an import page under Characters', async () => {
    const root = await open('/characters/import/pathbuilder');
    await vi.waitFor(() => {
      expect(trailOf(root)).toStrictEqual(['Characters', 'Import from Pathbuilder']);
    });
  });
});
