import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
} from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { HeaderCrumbs } from '../header-crumbs/header-crumbs';
import { Stack } from '../stack/stack.component';
import { injectRouteCrumbs } from './route-crumbs';

/**
 * The title area of an `fr-page`: the page's only `h1`, an optional description, and three slots.
 * It works out the breadcrumbs of the active route (`injectRouteCrumbs`) and shows them in the shell's header; pages do not pass items.
 * Project `[frPageActions]` beside the title, `[frPageIdentity]` below it in place of the visible title (with `titleHidden`), and `[frPageTabs]` below it.
 * While `title` is `undefined` the heading shows a skeleton.
 *
 * ```html
 * <fr-page-header [title]="title()" [description]="description()">
 *   <fr-stack frPageActions direction="horizontal" gap="sm">…</fr-stack>
 * </fr-page-header>
 * ```
 */
@Component({
  selector: 'fr-page-header',
  imports: [Heading, Skeleton, Stack, Text],
  templateUrl: './page-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class PageHeader {
  /** `undefined` while the page's subject is still loading: shows a skeleton. */
  public readonly title = input.required<string | undefined>();
  public readonly description = input<string | undefined>(undefined);
  /** Hides the heading from sight but not from screen readers, when `[frPageIdentity]` already shows the name. */
  public readonly titleHidden = input(false, { transform: booleanAttribute });

  protected readonly titleClasses = computed(() => (this.titleHidden() ? 'sr-only' : ''));

  public constructor() {
    const release = inject(HeaderCrumbs).show(injectRouteCrumbs());
    inject(DestroyRef).onDestroy(release);
  }
}
