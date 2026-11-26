import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants } from '../control.variants';

/** What the native input is: the `type` attribute of the controls that compose `fr-input`. */
export const InputType = {
  Text: 'text',
  Search: 'search',
  Number: 'number',
  Date: 'date',
} as const;

export type InputType = (typeof InputType)[keyof typeof InputType];

/** How `fr-input` styles its box: room for icons at the ends, or none. */
export const InputAdornment = { None: 'none', Both: 'both', Pair: 'pair' } as const;

export type InputAdornment = (typeof InputAdornment)[keyof typeof InputAdornment];

const ADORNED = { none: false, both: true, pair: 'pair' } as const satisfies Record<InputAdornment, boolean | 'pair'>;

/**
 * The one owner of the native `<input>`: its field wiring (id, description, invalid), look and Enter / Escape
 * commit keys, which ignore IME composition. The text, search, number and date controls compose it and parse
 * `value`, the raw text, themselves. Use one of those; use this only to build another.
 */
@Component({
  selector: 'fr-input',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class Input extends Control {
  public readonly type = input<InputType>(InputType.Text);
  /** The text in the box. */
  public readonly value = input('');
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly inputMode = input<string | undefined>(undefined);
  public readonly enterKeyHint = input<string | undefined>(undefined);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
  public readonly step = input<number | undefined>(undefined);
  /** Code-like text: fixed-width, and no spellcheck, autocapitalise or autocorrect, which would change what is typed. */
  public readonly monospace = input(false, { transform: booleanAttribute });
  /** Digits line up. */
  public readonly numeric = input(false, { transform: booleanAttribute });
  public readonly adornment = input<InputAdornment>(InputAdornment.None);
  /** The raw text after every edit. */
  public readonly typed = output<string>();

  protected readonly classes = computed(() =>
    controlVariants({
      monospace: this.monospace(),
      numeric: this.numeric(),
      adorned: ADORNED[this.adornment()],
    }),
  );
  protected readonly control = viewChild.required<ElementRef<HTMLInputElement>>('control');

  public constructor() {
    super();
    injectCommitKeys(this.control, {
      commit: () => {
        this.committed.emit();
      },
      cancel: () => {
        this.cancelled.emit();
      },
    });
  }

  /** Puts focus in the box. */
  public focus(): void {
    this.control().nativeElement.focus();
  }
}
