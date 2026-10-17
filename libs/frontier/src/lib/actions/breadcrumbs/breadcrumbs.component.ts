import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucideChevronRight } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Icon } from '../../icon/icon.component';
import { Link } from '../link/link.component';
import type { LinkTarget } from '../link/link.component';

/** One step of the path to the current page. Only the last needs no `to`; it is the page itself. */
export interface BreadcrumbItem {
  /** Already translated; `undefined` while the name loads, which shows a skeleton. */
  readonly label: string | undefined;
  readonly to?: LinkTarget;
}

const listClasses = cva('flex flex-nowrap items-center gap-2xs text-label')();
const itemVariants = cva('flex items-center gap-2xs', {
  variants: {
    // The middle shrinks; the first and last keep their width.
    position: { end: 'shrink-0', middle: 'min-w-none shrink' },
  },
});
const currentClasses = cva('whitespace-nowrap text-fg-default')();
const textClasses = cva('truncate text-fg-muted')();
const truncateClasses = cva('block truncate')();

function itemClasses(first: boolean, last: boolean): string {
  return itemVariants({ position: first || last ? 'end' : 'middle' });
}

/**
 * The path to the current page as links, the last item being the page itself (`aria-current="page"`, not a link).
 * A labelled `<nav>` with an ordered list that never wraps: on a narrow screen the middle items shrink and cut off
 * with an ellipsis, while the first (the way back to the start) and the last (where you are) stay whole. An item
 * without `to` is plain text. The landmark is named "Breadcrumb" unless `label` says otherwise. `fr-page-header` shows the trail of the active route itself (`injectRouteCrumbs`); use this directly only off a route.
 *
 * ```html
 * <fr-breadcrumbs [items]="crumbs()" />
 * ```
 */
@Component({
  selector: 'fr-breadcrumbs',
  imports: [Icon, Link, Skeleton, TranslocoPipe],
  templateUrl: './breadcrumbs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Breadcrumbs {
  /** Names the navigation landmark, already translated; "Breadcrumb" when omitted. */
  public readonly label = input<string | undefined>(undefined);
  public readonly items = input.required<readonly BreadcrumbItem[]>();

  protected readonly itemClasses = itemClasses;
  protected readonly separator = LucideChevronRight;
  protected readonly listClasses = listClasses;
  protected readonly currentClasses = currentClasses;
  protected readonly textClasses = textClasses;
  protected readonly truncateClasses = truncateClasses;
}
