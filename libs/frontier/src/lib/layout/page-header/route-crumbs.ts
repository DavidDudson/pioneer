import { computed, inject, Injector, runInInjectionContext, untracked } from '@angular/core';
import type { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import type { ActivatedRouteSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { filter, merge, scan } from 'rxjs';

import type { BreadcrumbItem } from '../../actions/breadcrumbs/breadcrumbs.component';

/** The key of a route's own `data` that names its step in the breadcrumb trail. */
export const CRUMB = 'crumb';

/**
 * A route's step in the trail, set as `data: { crumb }`.
 * - A string is a message key, translated when the trail shows.
 * - A function is called once per page header, in its injection context (so it can inject the route's stores and
 *   queries), with the route's snapshot. It returns the already translated name as a signal: `undefined` while the name
 *   loads, which shows a skeleton. The page itself renders at once; there is no resolver.
 *
 * Routes follow `{category}/{pluralThing}/{id}`: a category (Content Browser, Characters, Campaigns, Homebrew), the
 * plural name of the thing, then its id, each with a crumb. A collection that is its own category (`characters`) skips
 * the plural segment. A sheet tab is a child route after the id, so the tab is in the URL and is the last crumb.
 */
export type Crumb = string | ((route: ActivatedRouteSnapshot) => Signal<string | undefined>);

function isCrumb(value: unknown): value is Crumb {
  return typeof value === 'string' || typeof value === 'function';
}

/** The crumb a route's own config sets, not one inherited through `data`. */
function crumbOf(route: ActivatedRouteSnapshot): Crumb | undefined {
  const crumb: unknown = route.routeConfig?.data?.[CRUMB];
  return isCrumb(crumb) ? crumb : undefined;
}

/** The active route and its ancestors, root first, that have a crumb. */
function activeSteps(router: Router): ActivatedRouteSnapshot[] {
  const steps: ActivatedRouteSnapshot[] = [];
  for (
    let route: ActivatedRouteSnapshot | null = router.routerState.snapshot.root;
    route !== null;
    route = route.firstChild
  ) {
    if (crumbOf(route) !== undefined) {
      steps.push(route);
    }
  }
  return steps;
}

/** The URL a snapshot is at. */
function urlOf(route: ActivatedRouteSnapshot): string {
  const segments = route.pathFromRoot.flatMap((ancestor) => ancestor.url.map((segment) => segment.path));
  return `/${segments.join('/')}`;
}

/**
 * The trail to the active route, built from each route's `data.crumb` (see `Crumb`). Call it in an injection context
 * under the routes' providers, as `fr-page-header` does. The last step is the page itself, so it has no link. A trail
 * of one step is empty: a top-level page has nowhere to go back to.
 */
export function injectRouteCrumbs(): Signal<readonly BreadcrumbItem[]> {
  const router = inject(Router);
  const injector = inject(Injector);
  const i18n = inject(TranslocoService);
  const navigated = router.events.pipe(filter((event) => event instanceof NavigationEnd));
  const loaded = i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  // The router state and the messages are not signals: read them again when navigation settles or messages change.
  const changes = toSignal(merge(navigated, i18n.langChanges$, loaded).pipe(scan((count) => count + 1, 0)), {
    initialValue: 0,
  });
  // One name signal per URL, so its query is not repeated on every navigation.
  const names = new Map<string, Signal<string | undefined>>();

  /** Runs a crumb function once, in the header's injection context and outside the trail's own reactive one. */
  const nameOf = (route: ActivatedRouteSnapshot, crumb: Exclude<Crumb, string>): Signal<string | undefined> => {
    const url = urlOf(route);
    const known = names.get(url);
    if (known !== undefined) {
      return known;
    }
    const created = untracked(() => runInInjectionContext(injector, () => crumb(route)));
    names.set(url, created);
    return created;
  };

  const labelOf = (route: ActivatedRouteSnapshot, crumb: Crumb): string | undefined =>
    typeof crumb === 'string' ? i18n.translate(crumb) : nameOf(route, crumb)();

  return computed(() => {
    changes();
    const steps = activeSteps(router);
    if (steps.length < 2) {
      return [];
    }
    return steps.map((route, index): BreadcrumbItem => {
      const crumb = crumbOf(route);
      const label = crumb === undefined ? undefined : labelOf(route, crumb);
      return index === steps.length - 1 ? { label } : { label, to: urlOf(route) };
    });
  });
}
