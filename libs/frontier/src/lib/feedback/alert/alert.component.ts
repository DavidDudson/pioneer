import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';
import { X } from 'lucide';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import type { IconGlyph } from '../../icon/icon-glyph';
import { Icon } from '../../icon/icon.component';
import { toneVariants } from '../../tokens';

export const AlertTone = { Danger: 'danger', Warning: 'warning', Success: 'success', Info: 'info' } as const;

export type AlertTone = ValueOf<typeof AlertTone>;

/** Plain text adds no box of its own, so a bare alert lays out as the one-line caption it replaces. */
const alertVariants = cva('text-caption', {
  variants: {
    framed: { true: 'flex items-start gap-xs', false: 'contents' },
    tone: {
      danger: toneVariants.danger,
      warning: toneVariants.warning,
      success: toneVariants.success,
      info: toneVariants.info,
    } satisfies Record<AlertTone, string>,
  },
});

/** One line tall, so the icon centres on the first line of the text. */
const iconVariants = cva('flex h-lh shrink-0 items-center');

/** The text takes the spare width and may shrink below its content, so a long message wraps. */
const bodyVariants = cva('min-w-none flex-1');

/**
 * Inline feedback next to whatever caused it: never a toast. Problems are announced assertively
 * (`role="alert"`), confirmations politely. The live region is always rendered, so put an `@if` for the text
 * inside `fr-alert` where the layout allows, not around it.
 */
@Component({
  selector: 'fr-alert',
  imports: [Button, Icon, TranslocoPipe],
  templateUrl: './alert.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Alert {
  public readonly tone = input<AlertTone>(AlertTone.Danger);
  /** Lets a control point `aria-describedby` at this alert. */
  public readonly id = input<string | undefined>(undefined);
  /** Decorative; the text carries the meaning. */
  public readonly icon = input<IconGlyph | undefined>(undefined);
  /** Adds a close button; the caller removes the alert when `dismissed` fires. */
  public readonly dismissible = input(false, { transform: booleanAttribute });
  public readonly dismissed = output();

  protected readonly closeIcon: IconGlyph = X;
  protected readonly ButtonVariant = ButtonVariant;
  protected readonly iconClasses = iconVariants();
  protected readonly bodyClasses = bodyVariants();
  protected readonly classes = computed(() =>
    alertVariants({ tone: this.tone(), framed: this.icon() !== undefined || this.dismissible() }),
  );
  protected readonly role = computed(() =>
    this.tone() === AlertTone.Danger || this.tone() === AlertTone.Warning ? 'alert' : 'status',
  );

  protected dismiss(): void {
    this.dismissed.emit();
  }
}
