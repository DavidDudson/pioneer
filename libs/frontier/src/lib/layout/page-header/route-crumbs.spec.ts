import { signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { Routes } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { provideFrontierI18nTesting } from '../../testing/provide-frontier-i18n-testing';
import { part, renderProjected } from '../../testing/render-projected';
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

/** One step of the trail as shown: its text (empty while a skeleton stands in) and where it links. */
interface Step {
  readonly label: string;
  readonly href: string | undefined;
}

/** The trail `fr-page-header` shows at `url`. */
async function trailAt(url: string): Promise<Step[]> {
  await TestBed.inject(Router).navigateByUrl(url);
  const root = await renderProjected(PageHeader, { title: 'Fireball' }, []);
  return [...root.querySelectorAll('nav li')].map((item) => ({
    label: item.textContent.trim(),
    href: item.querySelector('a')?.getAttribute('href') ?? undefined,
  }));
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

  it('shows a skeleton for a name that has not loaded yet, and the name once it has', async () => {
    name.set(undefined);
    await TestBed.inject(Router).navigateByUrl('/content/spells/fireball');
    const root = await renderProjected(PageHeader, { title: undefined }, []);
    expect(root.querySelector('nav li:last-child fr-skeleton')).not.toBeNull();
    expect(part(root, 'h1').getAttribute('aria-busy')).toBe('true');

    name.set('Fireball');
    TestBed.tick();
    expect(root.querySelector('nav li:last-child')?.textContent.trim()).toBe('Fireball');
  });

  it('shows no trail on a route without crumbs or with a single one', async () => {
    await expect(trailAt('/plain')).resolves.toStrictEqual([]);
    await expect(trailAt('/content')).resolves.toStrictEqual([]);
  });
});
