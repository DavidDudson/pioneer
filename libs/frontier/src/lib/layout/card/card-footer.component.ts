import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { cva } from 'class-variance-authority';

import { paddingVariants } from '../../tokens';
import { injectCardPadding } from './card-padding';

const footerVariants = cva('flex flex-wrap items-center justify-end gap-sm', {
  variants: { padding: paddingVariants },
});

/** The footer of an `fr-card`: actions or a note at the end edge, padded from the card's padding token. The card draws the rule above it. */
@Component({
  selector: 'fr-card-footer',
  templateUrl: './card-footer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class CardFooter {
  private readonly padding = injectCardPadding();

  protected readonly classes = computed(() => footerVariants({ padding: this.padding() }));
}
