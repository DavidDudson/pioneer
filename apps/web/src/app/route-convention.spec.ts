import type { Route, Routes } from '@angular/router';
import { CRUMB } from '@pioneer/frontier';
import { describe, expect, it } from 'vitest';

import { appRoutes } from './app.routes';

/** The categories whose pages follow `{category}/{pluralThing}/{id}` and show a trail (Epic 11.7: browse chrome). */
const CATEGORIES = ['content', 'characters', 'campaigns', 'homebrew'];

/** A route and the URL path it is at. */
interface RouteAt {
  readonly route: Route;
  readonly path: string;
}

/** The route's own crumb, if it sets one. */
const crumbOf = (route: Route): unknown => route.data?.[CRUMB];

/** Every route below `routes`, each with the URL path it is at. */
function flatten(routes: Routes, parent = ''): RouteAt[] {
  return routes.flatMap((route) => {
    const path = [parent, route.path ?? ''].filter((part) => part !== '').join('/');
    return [{ route, path }, ...flatten(route.children ?? [], path)];
  });
}

async function treeOf(category: string): Promise<Routes> {
  const mounted = appRoutes.find((route) => route.path === category);
  if (mounted?.loadChildren === undefined) {
    throw new TypeError(`${category} is not a lazy route in the app`);
  }
  const loaded = await mounted.loadChildren();
  if (!Array.isArray(loaded)) {
    throw new TypeError(`${category} does not load routes`);
  }
  return unwrap(loaded);
}

/** A lone pathless route with no data only provides for its children (the campaigns key item search): look inside. */
function unwrap(routes: Routes): Routes {
  const [only] = routes;
  const isWrapper = routes.length === 1 && only?.path === '' && only.data === undefined && only.children !== undefined;
  return isWrapper ? unwrap(only.children ?? []) : routes;
}

/** The routes with a path of their own, which show as a step of the trail: a redirect never does. */
async function pagesOf(category: string): Promise<RouteAt[]> {
  const all = flatten(await treeOf(category));
  return all.filter(({ route }) => route.redirectTo === undefined && route.path !== undefined && route.path !== '');
}

async function idsOf(category: string): Promise<RouteAt[]> {
  const all = flatten(await treeOf(category));
  return all.filter(({ route }) => route.path?.includes(':') === true);
}

describe.each(CATEGORIES)('the %s routes', (category) => {
  it('open with the category as the first crumb', async () => {
    const [root] = await treeOf(category);
    expect(root?.data?.[CRUMB]).toBeTypeOf('string');
  });

  it('have a crumb on every page route, so the trail never skips a segment', async () => {
    const pages = await pagesOf(category);
    expect(pages.filter(({ route }) => crumbOf(route) === undefined).map(({ path }) => path)).toStrictEqual([]);
  });

  it('name an id with a crumb that is a function of its route, loaded lazily', async () => {
    const ids = await idsOf(category);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter(({ route }) => typeof crumbOf(route) !== 'function').map(({ path }) => path)).toStrictEqual([]);
  });
});
