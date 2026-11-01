import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

export const GemTone = {
  Blue: 'blue',
  Purple: 'purple',
  Red: 'red',
  Gold: 'gold',
  /** A rune that does nothing: black, and still. */
  Black: 'black',
} as const;
export type GemTone = ValueOf<typeof GemTone>;

/**
 * The cut-stone outline is a clipped box, so its border is the outer layer and the surface the inner one. Under
 * forced colours the fills are replaced by system colours, so the outline stays visible in a hole.
 */
const outlineVariants = cva(
  'inline-flex h-gem items-center justify-center p-3xs clip-gem forced-colors:bg-system-canvas-text',
  {
    variants: {
      tone: {
        blue: 'bg-rune-base motion-safe:animate-rune-pulse',
        purple: 'bg-rune-greater motion-safe:animate-rune-pulse',
        red: 'bg-rune-major motion-safe:animate-rune-pulse',
        gold: 'bg-rune-mythic motion-safe:animate-rune-pulse',
        black: 'bg-rune-void',
        empty: 'bg-line-default',
      } satisfies Record<GemTone | 'empty', string>,
    },
  },
);

const fillVariants = cva(
  'inline-flex h-full min-w-gem items-center justify-center bg-surface-base px-2xs leading-none clip-gem forced-colors:bg-system-canvas forced-colors:text-system-canvas-text',
  {
    variants: {
      tone: {
        blue: 'text-rune-base',
        purple: 'text-rune-greater',
        red: 'text-rune-major',
        gold: 'text-rune-mythic',
        black: 'text-rune-void',
        empty: 'text-fg-muted',
      } satisfies Record<GemTone | 'empty', string>,
    },
  },
);

const labelClasses = cva('sr-only')();

/**
 * A cut stone with a short run of glyphs on it, such as a rune. The glyphs take the tone's colour on a dark fill, inside a
 * tone-coloured outline. A filled gem pulses in its tone, and holds still under reduced motion or when black (it does nothing); with
 * no `tone` it is a hole: the same outline, empty. The glyphs are decorative; `label`, already translated, is read
 * out instead, so the tone is never the only signal.
 *
 * ```html
 * <fr-gem tone="purple" glyphs="ᚠᚢ" [label]="'Greater striking'" />
 * <fr-gem glyphs="+" [label]="'Empty rune slot'" />
 * ```
 */
@Component({
  selector: 'fr-gem',
  templateUrl: './gem.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Gem {
  /** Undefined for a hole. */
  public readonly tone = input<GemTone | undefined>(undefined);
  /** The glyphs on the stone. */
  public readonly glyphs = input.required<string>();
  public readonly label = input.required<string>();

  protected readonly outline = computed(() => outlineVariants({ tone: this.tone() ?? 'empty' }));
  protected readonly fill = computed(() => fillVariants({ tone: this.tone() ?? 'empty' }));
  protected readonly labelClasses = labelClasses;
}
