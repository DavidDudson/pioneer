import { booleanAttribute, ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

const addonVariants = cva('flex shrink-0 items-center justify-center', {
  variants: {
    /** Holds a button, which takes presses; otherwise the addon is a decorative icon and presses pass to the input. */
    action: { true: '', false: 'pointer-events-none min-w-control-md text-fg-subtle' },
  },
  defaultVariants: { action: false },
});

/** A part of an `fr-input-group` beside its `fr-input`: a decorative icon, or (with `action`) icon buttons. */
@Component({
  selector: 'fr-input-addon',
  templateUrl: './input-addon.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
})
export class InputAddon {
  public readonly action = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() => addonVariants({ action: this.action() }));
}
