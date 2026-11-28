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
import { Divider } from '../divider/divider.component';
import { SurfaceVariant, surfaceVariants } from '../surface/surface.component';
import { CardFooter } from './card-footer.component';
import { CardHeader } from './card-header.component';
import { CardContext } from './card-padding';

/**
 * A panel built of parts that pad themselves: the card has no padding of its own, so an `fr-divider` between parts
 * runs edge to edge. `padding` is the one token every part reads. Give it a `heading` (and `description`) for the
 * title row, `[frCardActions]` for controls beside it, `fr-card-content` for each body and `fr-card-footer` for the
 * end row, which the card sets off with a rule. It replaces a hand-built `fr-surface` > `fr-stack` > `fr-heading`.
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
  public readonly variant = input<SurfaceVariant>(SurfaceVariant.Raised);
  /** The padding of the header, every content part and the footer. */
  public readonly padding = input<Space>(Space.Lg);
  /** The title; leave it out, with `loading` off, for a card with no header. */
  public readonly heading = input<string | undefined>(undefined);
  /** Shows a busy skeleton in the header while the title loads; a card with neither `heading` nor `loading` has no header. */
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly description = input<string | undefined>(undefined);
  public readonly level = input<HeadingLevel>(HeadingLevel.Two);
  public readonly headingVariant = input<TextVariant | undefined>(undefined);
  public readonly anchor = input<string | undefined>(undefined);

  protected readonly showHeader = computed(() => this.heading() !== undefined || this.loading());
  public constructor() {
    inject(CardContext).attach(this.padding);
  }

  protected readonly footer = contentChild(CardFooter);
  protected readonly classes = computed(() => surfaceVariants({ variant: this.variant(), padding: Space.None }));
}
