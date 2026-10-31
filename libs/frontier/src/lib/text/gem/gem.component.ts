import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

export const GemTone = {
  Blue: 'blue',
  Purple: 'purple',
  Red: 'red',
  Gold: 'gold',
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
        empty: 'bg-line-default',
      } satisfies Record<GemTone | 'empty', string>,
    },
  },
);

const fillVariants = cva(
  'inline-flex h-full items-center justify-center clip-gem forced-colors:bg-system-canvas forced-colors:text-system-canvas-text',
  {
    variants: {
      tone: {
        blue: 'bg-rune-base text-on-rune',
        purple: 'bg-rune-greater text-on-rune',
        red: 'bg-rune-major text-on-rune',
        gold: 'bg-rune-mythic text-on-rune',
        empty: 'bg-surface-base text-fg-muted',
      } satisfies Record<GemTone | 'empty', string>,
    },
  },
);

const glyphClasses = cva('inline-block w-gem text-center leading-none')();
const labelClasses = cva('sr-only')();

/**
 * A cut stone with a short run of glyphs on it, such as a rune. Each glyph sits in its own fixed-width box, so a
 * run reads as monospace in any face. A filled gem pulses in its tone, and holds still under reduced motion; with
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
  /** The glyphs on the stone; each code point gets its own box. */
  public readonly glyphs = input.required<string>();
  public readonly label = input.required<string>();

  protected readonly outline = computed(() => outlineVariants({ tone: this.tone() ?? 'empty' }));
  protected readonly fill = computed(() => fillVariants({ tone: this.tone() ?? 'empty' }));
  protected readonly boxes = computed((): readonly string[] =>
    Array.from(new Intl.Segmenter().segment(this.glyphs()), ({ segment }) => segment),
  );
  protected readonly glyphClasses = glyphClasses;
  protected readonly labelClasses = labelClasses;
}
