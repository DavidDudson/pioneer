import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import type { ElementRef } from '@angular/core';
import { cva } from 'class-variance-authority';

import { injectCommitKeys } from '../commit-keys';
import { Control } from '../control';
import { controlVariants, groupedControlVariants } from '../control.variants';
import { INPUT_GROUP } from '../input-group/input-group';

/** What the native input is: the `type` attribute of the controls that compose `fr-input`. */
export const InputType = {
  Text: 'text',
  Search: 'search',
  Number: 'number',
  Date: 'date',
} as const;

export type InputType = (typeof InputType)[keyof typeof InputType];

/** The `inputmode` attribute: which on-screen keyboard a touch device shows. */
export const InputMode = {
  None: 'none',
  Text: 'text',
  Decimal: 'decimal',
  Numeric: 'numeric',
  Tel: 'tel',
  Search: 'search',
  Email: 'email',
  Url: 'url',
} as const;

export type InputMode = (typeof InputMode)[keyof typeof InputMode];

/** The `enterkeyhint` attribute: the label a touch keyboard gives its Enter key. */
export const EnterKeyHint = {
  Enter: 'enter',
  Done: 'done',
  Go: 'go',
  Next: 'next',
  Previous: 'previous',
  Search: 'search',
  Send: 'send',
} as const;

export type EnterKeyHint = (typeof EnterKeyHint)[keyof typeof EnterKeyHint];

/** How `fr-input` styles its box: room for an icon at each end, or none. Addons beside it use `fr-input-group`. */
export const InputAdornment = { None: 'none', Both: 'both' } as const;

export type InputAdornment = (typeof InputAdornment)[keyof typeof InputAdornment];

const ADORNED = { none: false, both: true } as const satisfies Record<InputAdornment, boolean>;

const hostVariants = cva('block', { variants: { grouped: { true: 'min-w-none flex-1', false: '' } } });

/** The one owner of the native `<input>`: the text, search, number and date controls compose it. */
@Component({
  selector: 'fr-input',
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'hostClasses' },
})
export class Input extends Control {
  public readonly type = input<InputType>(InputType.Text);
  public readonly value = input('');
  public readonly placeholder = input<string | undefined>(undefined);
  public readonly inputMode = input<InputMode | undefined>(undefined);
  public readonly enterKeyHint = input<EnterKeyHint | undefined>(undefined);
  public readonly min = input<number | undefined>(undefined);
  public readonly max = input<number | undefined>(undefined);
  public readonly step = input<number | undefined>(undefined);
  /** Code-like text: fixed-width, and no spellcheck, autocapitalise or autocorrect, which would change what is typed. */
  public readonly monospace = input(false, { transform: booleanAttribute });
  public readonly numeric = input(false, { transform: booleanAttribute });
  public readonly adornment = input<InputAdornment>(InputAdornment.None);
  /** The raw text after every edit. */
  public readonly typed = output<string>();

  /** Inside an `fr-input-group` the input is flat and the group draws the box. */
  readonly #grouped = inject(INPUT_GROUP, { optional: true }) !== null;
  protected readonly hostClasses = hostVariants({ grouped: this.#grouped });
  protected readonly classes = computed(() =>
    this.#grouped
      ? groupedControlVariants({ monospace: this.monospace(), numeric: this.numeric() })
      : controlVariants({
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
