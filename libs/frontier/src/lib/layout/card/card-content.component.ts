import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { cva } from 'class-variance-authority';

import { paddingVariants } from '../../tokens';
import { injectCardPadding } from './card-padding';

const contentVariants = cva('block', { variants: { padding: paddingVariants } });

/** A body of an `fr-card`, padded from the card's token. Project several with `fr-divider` between them. */
@Component({
  selector: 'fr-card-content',
  templateUrl: './card-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class CardContent {
  private readonly padding = injectCardPadding();

  protected readonly classes = computed(() => contentVariants({ padding: this.padding() }));
}
