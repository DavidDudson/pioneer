import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { Tone } from '../../tokens';
import { textVariants } from '../text.variants';
import type { TextVariant } from '../text.variants';

export const HeadingLevel = { One: 1, Two: 2, Three: 3, Four: 4 } as const;
export type HeadingLevel = ValueOf<typeof HeadingLevel>;

/** Read out while busy: the heading's only text then is a skeleton, so it would otherwise be empty. */
const loadingClasses = cva('sr-only')();

/** Look for each level unless `variant` overrides it; the level is the document outline, the variant is the size. */
const LEVEL_VARIANT: Record<HeadingLevel, TextVariant> = {
  1: 'title',
  2: 'heading',
  3: 'subheading',
  4: 'label',
};

/**
 * A heading. `level` sets the element (`h1`–`h4`) for the document outline;
 * `variant` changes the look without changing the outline.
 *
 * ```html
 * <fr-heading [level]="2" variant="subheading">Identity</fr-heading>
 * ```
 */
@Component({
  selector: 'fr-heading',
  imports: [NgTemplateOutlet, TranslocoPipe],
  templateUrl: './heading.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Heading {
  public readonly level = input.required<HeadingLevel>();
  public readonly variant = input<TextVariant | undefined>(undefined);
  public readonly tone = input<Tone>(Tone.Default);
  public readonly truncate = input(false, { transform: booleanAttribute });
  /** Marks the heading busy while its text is a skeleton, and names it "Loading" so it is never empty. */
  public readonly busy = input(false, { transform: booleanAttribute });

  protected readonly loadingClasses = loadingClasses;

  protected readonly classes = computed(() =>
    textVariants({
      variant: this.variant() ?? LEVEL_VARIANT[this.level()],
      tone: this.tone(),
      truncate: this.truncate(),
    }),
  );
}
