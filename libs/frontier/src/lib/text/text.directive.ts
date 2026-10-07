import { booleanAttribute, computed, Directive, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { TEXT_TONE, Tone } from '../tokens';

export const TextVariant = {
  Display: 'display',
  Title: 'title',
  Heading: 'heading',
  Subheading: 'subheading',
  Lead: 'lead',
  Body: 'body',
  Label: 'label',
  Caption: 'caption',
  Code: 'code',
} as const;
export type TextVariant = ValueOf<typeof TextVariant>;

export const FontWeight = { Regular: 'regular', Medium: 'medium', Semibold: 'semibold', Bold: 'bold' } as const;
export type FontWeight = ValueOf<typeof FontWeight>;

const VARIANT: Record<TextVariant, string> = {
  display: 'font-display text-display font-bold tracking-tight',
  title: 'font-display text-title font-semibold tracking-tight',
  heading: 'font-display text-heading font-semibold',
  subheading: 'text-subheading font-semibold',
  lead: 'text-lead',
  body: 'text-body',
  label: 'text-label font-medium',
  caption: 'text-caption',
  code: 'font-mono text-label',
};
const FONT_WEIGHT: Record<FontWeight, string> = {
  regular: 'font-regular',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

/**
 * Typography on any element, so semantics stay with the caller:
 * `<h1 frText="title">`, `<p frText tone="muted">`, `<span frText="caption">`.
 */
@Directive({
  selector: '[frText]',
  host: { '[class]': 'classes()' },
})
export class Text {
  public readonly variant = input<TextVariant | ''>(TextVariant.Body, { alias: 'frText' });
  public readonly tone = input<Tone>(Tone.Default);
  public readonly fontWeight = input<FontWeight | undefined>(undefined);
  public readonly truncate = input(false, { transform: booleanAttribute });
  public readonly numeric = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => {
    const variant = this.variant();
    const fontWeight = this.fontWeight();
    return [
      VARIANT[variant === '' ? TextVariant.Body : variant],
      TEXT_TONE[this.tone()],
      fontWeight === undefined ? '' : FONT_WEIGHT[fontWeight],
      this.truncate() ? 'truncate' : '',
      this.numeric() ? 'tabular-nums' : '',
    ].join(' ');
  });
}
