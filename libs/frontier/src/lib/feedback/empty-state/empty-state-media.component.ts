import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import type { IconGlyph } from '../../icon/icon-glyph';
import { Icon } from '../../icon/icon.component';

/** One title line tall, so the icon centres on the title's first line. */
const mediaVariants = cva('flex h-lh items-center empty:hidden');

/** The leading part of an `fr-empty-state`: a decorative `icon`, or any projected media. */
@Component({
  selector: 'fr-empty-state-media',
  imports: [Icon],
  templateUrl: './empty-state-media.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes' },
})
export class EmptyStateMedia {
  /** Decorative; the title carries the meaning. */
  public readonly icon = input<IconGlyph | undefined>(undefined);

  protected readonly classes = mediaVariants();
}
