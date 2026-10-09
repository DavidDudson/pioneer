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
          'justify-center font-medium bg-surface-base text-fg-default border border-line-default hover:bg-surface-sunken aria-pressed:border-accent-solid aria-pressed:bg-accent-subtle aria-pressed:text-accent-fg',
        ghost: 'justify-center font-medium text-fg-default hover:bg-surface-sunken',
        danger: 'justify-center font-medium bg-danger-solid text-accent-on-solid hover:bg-danger-solid-hover',
        inline:
          '-mx-2xs min-h-touch min-w-none px-2xs text-start text-body text-fg-default hover:bg-surface-sunken pointer-fine:min-h-control-sm',
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
  /** Makes this a toggle button: announced as pressed or not, and styled when on. Unset for a plain button. */
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
