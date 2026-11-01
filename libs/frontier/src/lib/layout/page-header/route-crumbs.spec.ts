import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Routes } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import type { LinkTarget } from '../../actions/link/link.component';
import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { renderProjected } from '../../testing/render-projected';
import { HeaderCrumbs } from '../header-crumbs/header-crumbs';
import { PageHeader } from './page-header.component';
import { CRUMB } from './route-crumbs';

/** The name of the open thing as a page would load it; `undefined` until it arrives. */
const name: WritableSignal<string | undefined> = signal(undefined);

/** The tree every spec navigates: a category, a plural thing, an id and a tab, as the app's routes follow. */
const routes: Routes = [
  {
    path: 'content',
    data: { [CRUMB]: 'frontier.breadcrumbs.label' },
    children: [
      { path: '', children: [] },
      {
        path: 'spells',
        data: { [CRUMB]: 'frontier.breadcrumbs.label' },
        children: [
          { path: '', children: [] },
          {
            path: ':slug',
            data: { [CRUMB]: () => name },
            children: [{ path: 'details', data: { [CRUMB]: 'frontier.breadcrumbs.label' }, children: [] }],
          },
        ],
      },
    ],
  },
  { path: 'plain', children: [] },
];

/** One step of the trail as the shell's header gets it: its text (`undefined` while loading) and where it links. */
interface Step {
  readonly label: string | undefined;
  readonly href: LinkTarget | undefined;
}

/** The trail `fr-page-header` hands the shell's header at `url`. */
async function trailAt(url: string): Promise<Step[]> {
  await TestBed.inject(Router).navigateByUrl(url);
  await renderProjected(PageHeader, { title: 'Fireball' }, []);
  return TestBed.inject(HeaderCrumbs)
    .trail()
    .map(({ label, to }) => ({ label, href: to }));
}

describe('route crumbs', () => {
  beforeEach(() => {
    name.set('Fireball');
    TestBed.configureTestingModule({ providers: [provideRouter(routes), ...provideFrontierI18nTesting()] });
  });

  it('builds the trail from the data.crumb of each route down to the active one', async () => {
    const trail = await trailAt('/content/spells/fireball/details');
    expect(trail.map(({ label }) => label)).toStrictEqual(['Breadcrumb', 'Breadcrumb', 'Fireball', 'Breadcrumb']);
  });

  it('links every step but the last to its own URL', async () => {
    const trail = await trailAt('/content/spells/fireball/details');
    expect(trail.map(({ href }) => href)).toStrictEqual([
      '/content',
      '/content/spells',
      '/content/spells/fireball',
      undefined,
    ]);
  });

  it('leaves the name empty until it has loaded, then fills it in', async () => {
    name.set(undefined);
    await TestBed.inject(Router).navigateByUrl('/content/spells/fireball');
    await renderProjected(PageHeader, { title: undefined }, []);
    const crumbs = TestBed.inject(HeaderCrumbs);
    expect(crumbs.trail().at(-1)?.label).toBeUndefined();

    name.set('Fireball');
    TestBed.tick();
    expect(crumbs.trail().at(-1)?.label).toBe('Fireball');
  });

  it('shows no trail on a route without crumbs or with a single one', async () => {
    await expect(trailAt('/plain')).resolves.toStrictEqual([]);
    await expect(trailAt('/content')).resolves.toStrictEqual([]);
  });
});
