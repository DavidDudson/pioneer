import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';
import { cva } from 'class-variance-authority';

import { Size } from '../../tokens';

export const ButtonVariant = {
  Primary: 'primary',
  Secondary: 'secondary',
  Ghost: 'ghost',
  Danger: 'danger',
  /** Looks like the text it sits in; e.g. an inline-edit read view. Sized by its content. */
  Inline: 'inline',
  /** A standalone on/off button, filled with the accent when on. Features use `fr-toggle-button`. */
  Toggle: 'toggle',
  /** One option of a segmented control, filled with the accent when chosen. Features use `fr-segmented`. */
  Segment: 'segment',
} as const;
export type ButtonVariant = ValueOf<typeof ButtonVariant>;

export const ButtonType = { Button: 'button', Submit: 'submit' } as const;
export type ButtonType = ValueOf<typeof ButtonType>;

/** Touch first: every size is at least `h-touch` (44px) unless the pointer is fine. */
const buttonVariants = cva(
  [
    'inline-flex items-center gap-xs whitespace-nowrap',
    'transition-colors duration-fast ease-standard focus-visible:focus-ring',
    'disabled:cursor-not-allowed disabled:opacity-disabled aria-busy:cursor-progress',
  ],
  {
    variants: {
      variant: {
        primary:
          'justify-center font-medium bg-accent-solid text-accent-on-solid hover:bg-accent-solid-hover active:bg-accent-solid-active',
        secondary:
          'justify-center font-medium bg-surface-base text-fg-default border border-line-default hover:bg-surface-sunken',
        ghost: 'justify-center font-medium text-fg-default hover:bg-surface-sunken',
        danger: 'justify-center font-medium bg-danger-solid text-accent-on-solid hover:bg-danger-solid-hover',
        inline:
          '-mx-2xs min-h-touch min-w-none px-2xs text-start text-body text-fg-default hover:bg-surface-sunken pointer-fine:min-h-control-sm',
        toggle: [
          'justify-center font-medium border border-line-default bg-surface-base text-fg-default hover:bg-surface-sunken',
          'aria-pressed:border-accent-solid aria-pressed:bg-accent-solid aria-pressed:text-accent-on-solid',
          'aria-pressed:hover:bg-accent-solid-hover aria-pressed:active:bg-accent-solid-active',
        ].join(' '),
        segment: [
          'w-full justify-center font-medium text-fg-muted hover:bg-surface-sunken hover:text-fg-default',
          'aria-pressed:bg-accent-solid aria-pressed:text-accent-on-solid aria-pressed:hover:bg-accent-solid-hover',
          'aria-pressed:hover:text-accent-on-solid',
        ].join(' '),
      } satisfies Record<ButtonVariant, string>,
      size: {
        sm: 'h-touch px-sm text-label pointer-fine:h-control-sm',
        md: 'h-touch px-md text-body pointer-fine:h-control-md',
        lg: 'h-control-lg px-lg text-lead',
        /** Content-sized; used by the inline variant. */
        fit: '',
      },
    },
  },
);

/**
 * A button. Renders a native `<button>`; handle presses with `(pressed)`.
 * For actions that call the server use `fr-async-button`.
 *
 * ```html
 * <fr-button variant="primary" (pressed)="next()">Next</fr-button>
 * ```
 */
@Component({
  selector: 'fr-button',
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Button {
  public readonly variant = input<ButtonVariant>(ButtonVariant.Secondary);
  public readonly size = input<Size>(Size.Md);
  public readonly type = input<ButtonType>(ButtonType.Button);
  public readonly disabled = input(false, { transform: booleanAttribute });
  /** Work is in flight: announced as busy and presses are ignored, but focus stays. */
  public readonly busy = input(false, { transform: booleanAttribute });
  /** Accessible name when the visible content is not enough (e.g. a value to edit). */
  public readonly ariaLabel = input<string | undefined>(undefined);
  public readonly describedBy = input<string | undefined>(undefined);
  /** Id of the native button, so a field's `<label for>` can name it. */
  public readonly controlId = input<string | undefined>(undefined);
  /** Announced as invalid; set by a control composed inside `fr-field`. */
  public readonly invalid = input(false, { transform: booleanAttribute });
  /**
   * Announces the button as pressed or not (`aria-pressed`); the `toggle` and `segment` variants fill
   * with the accent when on. Unset for a plain button. Features use `fr-toggle-button` or `fr-segmented`.
   */
  public readonly toggled = input<boolean | undefined>(undefined);
  public readonly pressed = output<MouseEvent>();

  protected readonly classes = computed(() => {
    const variant = this.variant();
    return buttonVariants({ variant, size: variant === ButtonVariant.Inline ? 'fit' : this.size() });
  });

  protected press(event: MouseEvent): void {
    if (this.busy()) {
      // Also stops a busy submit button from submitting its form again.
      event.preventDefault();
      return;
    }
    this.pressed.emit(event);
  }
}
