import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva, cx } from 'class-variance-authority';

import { Tone } from '../../tokens';
import { textVariants, TextVariant } from '../text.variants';
import type { FontWeight } from '../text.variants';
import { PhraseElement, TextPhrase } from './phrase.component';

/** The element `fr-text` renders. Pick `p` for a paragraph, `span` inside other text. */
export const TextElement = { Span: 'span', Paragraph: 'p', ...PhraseElement } as const;
export type TextElement = ValueOf<typeof TextElement>;

const PHRASE_ELEMENTS: ReadonlySet<TextElement> = new Set(Object.values(PhraseElement));

function isPhraseElement(element: TextElement): element is PhraseElement {
  return PHRASE_ELEMENTS.has(element);
}

/** Classes an element adds on top of the variant: `code` and `kbd` are always monospaced. */
const elementVariants = cva('', {
  variants: {
    element: {
      [TextElement.Span]: '',
      [TextElement.Paragraph]: '',
      [TextElement.Code]: 'font-mono',
      [TextElement.Keyboard]: 'border border-line-default bg-surface-sunken px-3xs font-mono',
      [TextElement.Abbreviation]: '',
      [TextElement.Quotation]: '',
    } satisfies Record<TextElement, string>,
  },
});

/**
 * Body copy. Renders a `<span>` (default) or `<p>` (`element="p"`), or inline `<code>`, `<kbd>`, `<abbr>` or
 * `<q>`; headings use `fr-heading`, block quotes `fr-quote`.
 *
 * ```html
 * <fr-text element="p" tone="muted">Your Pathfinder heroes.</fr-text>
 * <fr-text element="abbr" [expansion]="'stat.ac' | transloco">{{ 'stat.ac.short' | transloco }}</fr-text>
 * ```
 */
@Component({
  selector: 'fr-text',
  imports: [NgTemplateOutlet, TextPhrase],
  templateUrl: './text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Text {
  public readonly element = input<TextElement>(TextElement.Span);
  public readonly variant = input<TextVariant>(TextVariant.Body);
  public readonly tone = input<Tone>(Tone.Default);
  public readonly weight = input<FontWeight | undefined>(undefined);
  public readonly truncate = input(false, { transform: booleanAttribute });
  public readonly numeric = input(false, { transform: booleanAttribute });
  public readonly preformatted = input(false, { transform: booleanAttribute });
  /** What an `abbr` stands for, already translated. The other elements ignore it. */
  public readonly expansion = input<string | undefined>(undefined);

  protected readonly phraseElement = computed((): PhraseElement | undefined => {
    const element = this.element();
    return isPhraseElement(element) ? element : undefined;
  });

  protected readonly classes = computed(() =>
    cx(
      textVariants({
        variant: this.variant(),
        tone: this.tone(),
        weight: this.weight(),
        truncate: this.truncate(),
        numeric: this.numeric(),
        preformatted: this.preformatted(),
      }),
      elementVariants({ element: this.element() }),
    ),
  );
}
