import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Tone } from '../../tokens';
import { TextVariant } from '../text.variants';
import { Text } from '../text/text.component';

/**
 * A block quotation, such as a passage of rules text, set off by a rule at its inline start. Project its
 * paragraphs as `fr-text element="p"`; inline quotes use `fr-text element="q"`. The optional `attribution`,
 * already translated, names the source below the quote and outside the `<blockquote>`, as HTML requires.
 *
 * ```html
 * <fr-quote [attribution]="'source.player-core' | transloco">
 *   <fr-text element="p">{{ 'condition.frightened.description' | transloco }}</fr-text>
 * </fr-quote>
 * ```
 */
@Component({
  selector: 'fr-quote',
  imports: [Text],
  templateUrl: './quote.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Quote {
  public readonly attribution = input<string | undefined>(undefined);

  protected readonly frameClasses = cva('flex flex-col gap-2xs border-s border-line-strong ps-sm')();
  protected readonly quoteClasses = cva('flex flex-col gap-xs')();
  protected readonly Tone = Tone;
  protected readonly TextVariant = TextVariant;
}
