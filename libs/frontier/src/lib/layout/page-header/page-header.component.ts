import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { Stack } from '../stack/stack.component';

/**
 * The title area of an `fr-page`: the page's only `h1`, an optional description, and three slots.
 * Project `[frPageBreadcrumbs]` above the title, `[frPageActions]` beside it and `[frPageTabs]` below it.
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
}
