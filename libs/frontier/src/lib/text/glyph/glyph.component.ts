import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { cva } from 'class-variance-authority';

const labelClasses = cva('sr-only')();

/**
 * A rules symbol that stands for words and has no Lucide icon, such as a PF2e action glyph. The symbol is shown
 * and hidden from screen readers; `label`, already translated, is read out instead.
 *
 * ```html
 * <fr-glyph [label]="'rules.richText.actionCost.two.label' | transloco">◆◆</fr-glyph>
 * ```
 */
@Component({
  selector: 'fr-glyph',
  templateUrl: './glyph.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Glyph {
  public readonly label = input.required<string>();

  protected readonly labelClasses = labelClasses;
}
