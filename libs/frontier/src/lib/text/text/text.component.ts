import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva, cx } from 'class-variance-authority';

import { damageToneVariants, Tone } from '../../tokens';
import type { DamageTone } from '../../tokens';
import { TextVariant, textVariants } from '../text.variants';
import type { FontWeight, MinWidth } from '../text.variants';
import { PhraseElement, TextPhrase } from './phrase.component';
import { StressElement, TextStress } from './stress.component';

/**
 * The element `fr-text` renders. Pick `p` for a paragraph, `span` inside other text, `pre` for a block of code
 * (formulas, JSON, rule trees) that keeps its line breaks.
 */
export const TextElement = {
  Span: 'span',
  Paragraph: 'p',
  Preformatted: 'pre',
  ...PhraseElement,
  ...StressElement,
} as const;
export type TextElement = ValueOf<typeof TextElement>;

const PHRASE_ELEMENTS: ReadonlySet<TextElement> = new Set(Object.values(PhraseElement));

function isPhraseElement(element: TextElement): element is PhraseElement {
  return PHRASE_ELEMENTS.has(element);
}

const STRESS_ELEMENTS: ReadonlySet<TextElement> = new Set(Object.values(StressElement));

function isStressElement(element: TextElement): element is StressElement {
  return STRESS_ELEMENTS.has(element);
}

/**
 * Classes an element adds on top of the variant: `pre`, `code` and `kbd` are always monospaced. `pre` keeps line
 * breaks and indentation, wrapping long lines instead of scrolling; code breaks long tokens such as JSON.
 */
const elementVariants = cva('', {
  variants: {
    element: {
      [TextElement.Span]: '',
      [TextElement.Paragraph]: '',
      [TextElement.Preformatted]: 'font-mono break-words whitespace-pre-wrap',
      [TextElement.Code]: 'font-mono wrap-anywhere',
      [TextElement.Keyboard]: 'border border-line-default bg-surface-sunken px-3xs font-mono',
      [TextElement.Abbreviation]: '',
      [TextElement.Quotation]: '',
      [TextElement.Emphasis]: 'italic',
      [TextElement.Strong]: 'font-semibold',
    } satisfies Record<TextElement, string>,
  },
});

/**
 * Body copy. Renders a `<span>` (default), `<p>` (`element="p"`) or block code `<pre>` (`element="pre"`), or
 * inline `<code>`, `<kbd>`, `<abbr>`, `<q>`, `<em>` or `<strong>`; headings use `fr-heading`, block quotes `fr-quote`.
 *
 * ```html
 * <fr-text element="p" tone="muted">Your Pathfinder heroes.</fr-text>
 * <fr-text element="abbr" [expansion]="'stat.ac' | transloco">{{ 'stat.ac.short' | transloco }}</fr-text>
 * ```
 */
@Component({
  selector: 'fr-text',
  imports: [NgTemplateOutlet, TextPhrase, TextStress],
  templateUrl: './text.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Text {
  public readonly element = input<TextElement>(TextElement.Span);
  public readonly variant = input<TextVariant>(TextVariant.Body);
  public readonly tone = input<Tone>(Tone.Default);
  /** Colours the text by a damage type instead of its tone (a roll's total; the type is named alongside). */
  public readonly damage = input<DamageTone | undefined>(undefined);
  public readonly weight = input<FontWeight | undefined>(undefined);
  public readonly truncate = input(false, { transform: booleanAttribute });
  public readonly numeric = input(false, { transform: booleanAttribute });
  /** Sets the text in the monospace face, so digits line up in a column. */
  public readonly monospace = input(false, { transform: booleanAttribute });
  /** A floor for the width, centring shorter text in it. Only a plain span takes it. */
  public readonly minWidth = input<MinWidth | undefined>(undefined);
  /** What an `abbr` stands for, already translated. The other elements ignore it. */
  public readonly expansion = input<string | undefined>(undefined);

  protected readonly phraseElement = computed((): PhraseElement | undefined => {
    const element = this.element();
    return isPhraseElement(element) ? element : undefined;
  });

  protected readonly stressElement = computed((): StressElement | undefined => {
    const element = this.element();
    return isStressElement(element) ? element : undefined;
  });

  protected readonly classes = computed(() => {
    const damage = this.damage();
    return cx(
      textVariants({
        variant: this.variant(),
        tone: damage === undefined ? this.tone() : undefined,
        weight: this.weight(),
        truncate: this.truncate(),
        numeric: this.numeric(),
        monospace: this.monospace(),
        minWidth: this.minWidth(),
      }),
      elementVariants({ element: this.element() }),
      damage === undefined ? '' : damageToneVariants[damage],
      this.minWidth() === undefined ? '' : 'inline-block text-center',
    );
  });
}
