import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { toneVariants } from '../tokens';

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
  /** The app's wordmark. */
  Brand: 'brand',
} as const;
export type TextVariant = ValueOf<typeof TextVariant>;

export const FontWeight = { Regular: 'regular', Medium: 'medium', Semibold: 'semibold', Bold: 'bold' } as const;
export type FontWeight = ValueOf<typeof FontWeight>;

/** Typography shared by every text-bearing primitive (fr-text, fr-heading, fr-label, fr-link). */
export const textVariants = cva('', {
  variants: {
    variant: {
      display: 'font-display text-display font-bold tracking-tight',
      title: 'font-display text-title font-semibold tracking-tight',
      heading: 'font-display text-heading font-semibold',
      subheading: 'text-subheading font-semibold',
      lead: 'text-lead',
      body: 'text-body',
      label: 'text-label font-medium',
      caption: 'text-caption',
      code: 'font-mono text-label',
      brand: 'font-display text-subheading font-semibold',
    } satisfies Record<TextVariant, string>,
    tone: toneVariants,
    weight: {
      regular: 'font-regular',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    } satisfies Record<FontWeight, string>,
    truncate: { true: 'truncate', false: '' },
    numeric: { true: 'tabular-nums', false: '' },
    /** Keeps line breaks and indentation (formatted JSON), wrapping long lines instead of scrolling. */
    preformatted: { true: 'whitespace-pre-wrap break-words', false: '' },
  },
});
