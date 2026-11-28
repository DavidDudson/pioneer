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
import * as z from 'zod';

import messages from '../i18n/en.json';
import { campaignRoutes } from './campaign.routes';
import { CampaignStore } from './data/campaign-store';
import { StubPage } from './testing/stub-page.component';

/** The real routes with every page replaced by `StubPage` and the store by one that holds the open campaign. */
function stubbed(routes: ReadonlyArray<Route>): Array<Route> {
  return routes.map((route): Route => {
    const providers = route.providers?.map((provider) =>
      provider === CampaignStore
        ? {
            provide: CampaignStore,
            useValue: { selected: { data: signal({ name: 'Moonlit Hunt' }), isError: signal(false) } },
          }
        : provider,
    );

    const stub: Route = {};

    if (route.path !== undefined) {
      stub.path = route.path;
    }

    if (route.data !== undefined) {
      stub.data = route.data;
    }

    if (providers !== undefined) {
      stub.providers = providers;
    }

    if (route.children === undefined) {
      stub.component = StubPage;
    } else {
      stub.children = stubbed(route.children);
    }

    return stub;
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
const trailOf = (): Array<string | undefined> =>
  TestBed.inject(HeaderCrumbs)
    .trail()
    .map(({ label }) => label);

/** Where the trail's links go. */
const hrefsOf = (): Array<string> =>
  TestBed.inject(HeaderCrumbs)
    .trail()
    .flatMap(({ to }): Array<string> => {
      const href = z.string().safeParse(to);

      return href.success ? [href.data] : [];
    });

describe('campaign routes', () => {
  it('trails Campaigns and the campaign', async () => {
    await open('/campaigns/moonlit-hunt');
    await vi.waitFor(() => {
      expect(trailOf()).toStrictEqual(['Campaigns', 'Moonlit Hunt']);
    });
    expect(hrefsOf()).toStrictEqual(['/campaigns']);
  });
});
