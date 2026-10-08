import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LucideIcon } from '@lucide/angular';
import { LucideDynamicIcon } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Size, toneVariants } from '../tokens';
import type { Tone } from '../tokens';

/** Every icon draws 2px lines at every size. Not configurable. */
const STROKE_WIDTH = 2;

const iconVariants = cva('inline-block shrink-0', {
  variants: {
    size: { sm: 'size-sm', md: 'size-md', lg: 'size-lg' } satisfies Record<Size, string>,
    tone: { inherit: '', ...toneVariants } satisfies Record<Tone | 'inherit', string>,
    spin: { true: 'animate-spin', false: '' },
  },
});

/**
 * A Lucide icon (`import { LucideCheck } from '@lucide/angular'`), and the
 * only owner of `<svg>`. Decorative (`aria-hidden`) unless given a label.
 * Lines are 2px at every size; colour follows the text unless a tone is set.
 */
@Component({
  selector: 'fr-icon',
  imports: [LucideDynamicIcon],
  templateUrl: './icon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Icon {
  public readonly icon = input.required<LucideIcon>();
  public readonly size = input<Size>(Size.Sm);
  public readonly tone = input<Tone | undefined>(undefined);
  public readonly label = input<string | undefined>(undefined);
  /** Rotate continuously. Progress indicators only. */
  public readonly spin = input(false, { transform: booleanAttribute });

  protected readonly strokeWidth = STROKE_WIDTH;
  protected readonly classes = computed(() =>
    iconVariants({ size: this.size(), tone: this.tone() ?? 'inherit', spin: this.spin() }),
  );
}
