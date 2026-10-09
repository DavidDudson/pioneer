import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { Tone } from '../../tokens';
import { textVariants, TextVariant } from '../text.variants';
import type { FontWeight } from '../text.variants';

/** The element `fr-text` renders. Pick `p` for a paragraph, `span` inside other text. */
export const TextElement = { Span: 'span', Paragraph: 'p' } as const;
export type TextElement = ValueOf<typeof TextElement>;

/**
 * Body copy. Renders a `<span>` (default) or `<p>` (`element="p"`); headings use `fr-heading`.
 *
 * ```html
 * <fr-text element="p" tone="muted">Your Pathfinder heroes.</fr-text>
 * ```
 */
@Component({
  selector: 'fr-text',
  imports: [NgTemplateOutlet],
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

  protected readonly classes = computed(() =>
    textVariants({
      variant: this.variant(),
      tone: this.tone(),
      weight: this.weight(),
      truncate: this.truncate(),
      numeric: this.numeric(),
      preformatted: this.preformatted(),
    }),
  );
}
