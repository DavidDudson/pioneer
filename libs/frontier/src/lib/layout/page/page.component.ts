import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Heading } from '../../text/heading/heading.component';
import { Text } from '../../text/text/text.component';
import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';

/**
 * A routed page: title, optional description, actions slot, content.
 * Put actions in `<fr-stack frPageActions>` (or any element with the attribute).
 * The page renders at once; regions load their own data behind skeletons.
 * It sits in `fr-shell`'s `<main>`, so it renders no landmark of its own.
 * Built only from layout primitives; it has no responsive CSS of its own.
 */
@Component({
  selector: 'fr-page',
  imports: [Box, Heading, Skeleton, Stack, Text],
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Page {
  /** `undefined` while the page's subject is still loading: shows a skeleton. */
  public readonly title = input.required<string | undefined>();
  public readonly description = input<string | undefined>(undefined);
}
