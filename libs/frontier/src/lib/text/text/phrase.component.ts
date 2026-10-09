import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

/** The inline semantic elements `fr-text` renders through `fr-text-phrase`. */
export const PhraseElement = {
  /** A formula, an identifier or a snippet of JSON. Monospaced. */
  Code: 'code',
  /** A key the user presses. Monospaced and boxed. */
  Keyboard: 'kbd',
  /** An abbreviation such as AC or DC; `expansion` spells it out. */
  Abbreviation: 'abbr',
  /** A short inline quotation; the browser adds the locale's quotation marks. Block quotes use `fr-quote`. */
  Quotation: 'q',
} as const;
export type PhraseElement = ValueOf<typeof PhraseElement>;

/** `fr-text`'s inline semantic elements, styled by `fr-text`. Internal: features use `fr-text element="…"`. */
@Component({
  selector: 'fr-text-phrase',
  imports: [NgTemplateOutlet],
  templateUrl: './phrase.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class TextPhrase {
  public readonly element = input.required<PhraseElement>();
  public readonly classes = input.required<string>();
  public readonly expansion = input<string | undefined>(undefined);
}
