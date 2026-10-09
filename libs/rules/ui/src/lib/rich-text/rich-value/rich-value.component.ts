import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';

import { RICH_TEXT_LINKS } from '../rich-text-links';
import { valueText } from './value-text';
import type { ValueNode, ValueText } from './value-text';

/** A check, damage, area or duration inside text, set off so it reads as something to roll or measure. */
@Component({
  selector: 'pio-rich-value',
  imports: [Text, TranslocoPipe],
  templateUrl: './rich-value.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichValue {
  public readonly node = input.required<ValueNode>();

  readonly #links = inject(RICH_TEXT_LINKS);
  protected readonly text = computed((): ValueText => valueText(this.node(), this.#links));
  /** The author's own wording, which checks and damage may give instead of the generated text. */
  protected readonly label = computed((): string | undefined => {
    const node = this.node();
    return 'label' in node ? node.label : undefined;
  });
}
