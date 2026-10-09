import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { LucideIcon } from '@lucide/angular';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { Icon } from '../../icon/icon.component';

export const BadgeTone = {
  Neutral: 'neutral',
  Accent: 'accent',
  Danger: 'danger',
  Success: 'success',
  Warning: 'warning',
  Info: 'info',
} as const;
export type BadgeTone = ValueOf<typeof BadgeTone>;

export const BadgeVariant = {
  /** Tinted surface, coloured text and border. The default; reads quietly in a row of traits. */
  Subtle: 'subtle',
  /** Filled with the tone. For the one badge that must stand out, such as a condition. */
  Solid: 'solid',
} as const;
export type BadgeVariant = ValueOf<typeof BadgeVariant>;

/**
 * Sharp and flat: a border and a surface colour, no radius or shadow. The border is drawn in every variant so
 * subtle and solid badges are the same size. Solid fills use the `*-emphasis` tokens, which keep small text at
 * 4.5:1 or more in every theme and mode.
 */
const badgeVariants = cva('inline-flex items-center gap-3xs border px-2xs text-caption font-medium whitespace-nowrap', {
  variants: {
    tone: {
      neutral: '',
      accent: '',
      danger: '',
      success: '',
      warning: '',
      info: '',
    } satisfies Record<BadgeTone, string>,
    variant: { subtle: '', solid: '' } satisfies Record<BadgeVariant, string>,
  },
  compoundVariants: [
    {
      variant: 'subtle',
      tone: 'neutral',
      class: 'border-line-default bg-surface-sunken text-fg-default',
    },
    {
      variant: 'subtle',
      tone: 'accent',
      class: 'border-accent-line bg-accent-subtle text-accent-fg',
    },
    {
      variant: 'subtle',
      tone: 'danger',
      class: 'border-danger-line bg-danger-subtle text-danger-fg',
    },
    {
      variant: 'subtle',
      tone: 'success',
      class: 'border-success-line bg-success-subtle text-success-fg',
    },
    {
      variant: 'subtle',
      tone: 'warning',
      class: 'border-warning-line bg-warning-subtle text-warning-fg',
    },
    {
      variant: 'subtle',
      tone: 'info',
      class: 'border-info-line bg-info-subtle text-info-fg',
    },
    {
      variant: 'solid',
      tone: 'neutral',
      class: 'border-surface-inverse bg-surface-inverse text-fg-inverse',
    },
    {
      variant: 'solid',
      tone: 'accent',
      class: 'border-accent-emphasis bg-accent-emphasis text-accent-on-emphasis',
    },
    {
      variant: 'solid',
      tone: 'danger',
      class: 'border-danger-emphasis bg-danger-emphasis text-danger-on-emphasis',
    },
    {
      variant: 'solid',
      tone: 'success',
      class: 'border-success-emphasis bg-success-emphasis text-success-on-emphasis',
    },
    {
      variant: 'solid',
      tone: 'warning',
      class: 'border-warning-emphasis bg-warning-emphasis text-warning-on-emphasis',
    },
    {
      variant: 'solid',
      tone: 'info',
      class: 'border-info-emphasis bg-info-emphasis text-info-on-emphasis',
    },
  ],
});

/**
 * A short label: a trait, a rarity or a condition's value. The text is projected; an optional leading Lucide
 * `icon` is decorative and takes the badge's text colour.
 *
 * ```html
 * <fr-badge tone="danger" variant="solid" [icon]="Skull">{{ 'condition.dying' | transloco: { value: 2 } }}</fr-badge>
 * ```
 */
@Component({
  selector: 'fr-badge',
  imports: [Icon],
  templateUrl: './badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Badge {
  public readonly tone = input<BadgeTone>(BadgeTone.Neutral);
  public readonly variant = input<BadgeVariant>(BadgeVariant.Subtle);
  public readonly icon = input<LucideIcon | undefined>(undefined);

  protected readonly classes = computed(() => badgeVariants({ tone: this.tone(), variant: this.variant() }));
}
