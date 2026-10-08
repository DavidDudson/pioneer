import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ValueOf } from '@pioneer/shared/kernel';

import { Spinner } from '../../feedback/spinner/spinner.component';
import { Size } from '../../tokens';

export const ButtonVariant = { Primary: 'primary', Secondary: 'secondary', Ghost: 'ghost', Danger: 'danger' } as const;
export type ButtonVariant = ValueOf<typeof ButtonVariant>;

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-accent-solid text-accent-on-solid hover:bg-accent-solid-hover active:bg-accent-solid-active',
  secondary: 'bg-surface-base text-fg-default border border-line-default hover:bg-surface-sunken',
  ghost: 'text-fg-default hover:bg-surface-sunken',
  danger: 'bg-danger-solid text-accent-on-solid hover:opacity-90',
};

/** Touch first: every size is at least 2.75rem (44px) tall unless the pointer is fine. */
const SIZE: Record<Size, string> = {
  sm: 'h-[2.75rem] pointer-fine:h-[2rem] px-sm text-label',
  md: 'h-[2.75rem] pointer-fine:h-[2.5rem] px-md text-body',
  lg: 'h-[3rem] px-lg text-lead',
};

/** Native `<button fr-button>`; keeps button semantics, adds loading state. */
@Component({
  selector: 'button[fr-button]',
  imports: [Spinner],
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.aria-busy]': 'loading() || null',
    '[attr.aria-disabled]': 'loading() || null',
    '[disabled]': 'disabled()',
  },
})
export class Button {
  public readonly variant = input<ButtonVariant | ''>(ButtonVariant.Secondary, { alias: 'fr-button' });
  public readonly size = input<Size>(Size.Md);
  public readonly loading = input(false, { transform: booleanAttribute });
  public readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => {
    const variant = this.variant();
    return [
      'inline-flex items-center justify-center gap-xs rounded-control font-medium whitespace-nowrap',
      'transition-colors duration-150 ease-standard focus-visible:focus-ring',
      'disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress',
      VARIANT[variant === '' ? ButtonVariant.Secondary : variant],
      SIZE[this.size()],
    ].join(' ');
  });
}
