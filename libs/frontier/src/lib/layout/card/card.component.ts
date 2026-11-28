import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  inject,
  input,
} from '@angular/core';

import { HeadingLevel } from '../../text/heading/heading.component';
import type { TextVariant } from '../../text/text.variants';
import { Space } from '../../tokens';
import type { Padding } from '../../tokens';
import { Divider } from '../divider/divider.component';
import { surfaceVariants } from '../surface/surface.component';
import { CardFooter } from './card-footer.component';
import { CardHeader } from './card-header.component';
import { CardContext } from './card-padding';

/**
 * A titled panel of parts that pad themselves: the card has no padding of its own, so an `fr-divider` between parts
 * runs edge to edge. `[frCardActions]` sits beside the heading and shows only when the card has a header.
 *
 * ```html
 * <fr-card [heading]="title()">
 *   <fr-button frCardActions variant="ghost">…</fr-button>
 *   <fr-card-content>…</fr-card-content>
 *   <fr-card-footer><fr-button>…</fr-button></fr-card-footer>
 * </fr-card>
 * ```
 */
@Component({
  selector: 'fr-card',
  imports: [CardHeader, Divider],
  templateUrl: './card.component.html',
  providers: [CardContext],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class Card {
  public readonly padding = input<Padding>(Space.Lg);
  public readonly heading = input<string | undefined>(undefined);
  /** Shows the header, with a skeleton heading while `heading` is `undefined`; without `heading` or `loading` there is no header. */
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly description = input<string | undefined>(undefined);
  public readonly level = input<HeadingLevel>(HeadingLevel.Two);
  public readonly headingVariant = input<TextVariant | undefined>(undefined);
  public readonly anchor = input<string | undefined>(undefined);

  protected readonly showHeader = computed(() => this.heading() !== undefined || this.loading());
  protected readonly footerPart = contentChild(CardFooter, { descendants: false });
  protected readonly classes = computed(() => surfaceVariants({ padding: Space.None }));

  public constructor() {
    inject(CardContext).attach(this.padding);
  }
}
