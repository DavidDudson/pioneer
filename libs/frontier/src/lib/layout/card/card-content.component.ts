import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { cva } from 'class-variance-authority';

import { paddingVariants } from '../../tokens';
import { CardContext, DEFAULT_CARD_PADDING } from './card-padding';

const contentVariants = cva('block', { variants: { padding: paddingVariants } });

/**
 * A body of an `fr-card`, padded from the card's padding token. Project several, with `fr-divider` between them, and
 * the dividers run edge to edge because the card itself has no padding.
 */
@Component({
  selector: 'fr-card-content',
  templateUrl: './card-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class CardContent {
  private readonly context = inject(CardContext, { optional: true });

  protected readonly classes = computed(() =>
    contentVariants({ padding: this.context?.padding() ?? DEFAULT_CARD_PADDING }),
  );
}
