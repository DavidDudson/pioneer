import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Skeleton } from '../../feedback/skeleton/skeleton.component';
import { Heading, HeadingLevel } from '../../text/heading/heading.component';
import type { TextVariant } from '../../text/text.variants';
import { Text } from '../../text/text/text.component';
import { paddingVariants } from '../../tokens';
import { Stack } from '../stack/stack.component';
import { injectCardPadding } from './card-padding';

/** A body right below the header supplies the gap itself, so the paddings do not stack; a divider keeps the header's. */
const headerVariants = cva('block before-body:pb-none', { variants: { padding: paddingVariants } });

/** The title row of an `fr-card`: heading, optional description, and projected actions at the end edge. */
@Component({
  selector: 'fr-card-header',
  imports: [Heading, Skeleton, Stack, Text],
  templateUrl: './card-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class CardHeader {
  /** `undefined` while the subject is still loading: shows a skeleton. */
  public readonly heading = input.required<string | undefined>();
  public readonly description = input<string | undefined>(undefined);
  public readonly level = input<HeadingLevel>(HeadingLevel.Two);
  /** Overrides the look of the level; the level stays the document outline. */
  public readonly headingVariant = input<TextVariant | undefined>(undefined);
  /** The heading's id, for a region labelled by it or a skip link. */
  public readonly anchor = input<string | undefined>(undefined);

  private readonly padding = injectCardPadding();

  protected readonly classes = computed(() => headerVariants({ padding: this.padding() }));
}
