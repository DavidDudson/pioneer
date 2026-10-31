import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Route } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages, HeaderCrumbs } from '@pioneer/frontier';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import messages from '../i18n/en.json';
import { campaignRoutes } from './campaign.routes';
import { CampaignStore } from './data/campaign-store';
import { StubPage } from './testing/stub-page.component';

/** The real routes with every page replaced by `StubPage` and the store by one that holds the open campaign. */
function stubbed(routes: readonly Route[]): Route[] {
  return routes.map((route): Route => {
    const providers = route.providers?.map((provider) =>
      provider === CampaignStore
        ? {
            provide: CampaignStore,
            useValue: { selected: { data: signal({ name: 'Moonlit Hunt' }), isError: signal(false) } },
          }
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

async function open(url: string): Promise<void> {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'campaigns', children: stubbed(campaignRoutes) }]),
      provideI18n({ en: async () => ({ ...frontierMessages, campaign: messages }) }),
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
    .flatMap(({ to }): string[] => (typeof to === 'string' ? [to] : []));

describe('campaign routes', () => {
  it('trails Campaigns and the campaign', async () => {
    await open('/campaigns/moonlit-hunt');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Campaigns', 'Moonlit Hunt']);
    });
    expect(hrefsOf()).toStrictEqual(['/campaigns']);
  });
});
