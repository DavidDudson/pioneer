import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { AsyncIndicator, Button, injectAsyncAction, Message, Stack, Text } from '@pioneer/frontier';

import { LanguagePicker } from '../slot-picker/language-picker.component';
import type { LanguagePickerRow } from '../slot-picker/slot-picker-row';
import { LanguagesMessage } from './languages-messages';

/** Adds a language in the next open slot; resolves once it is saved. */
export type AddLanguage = (language: string) => Promise<unknown>;

/**
 * Add language, while the character has languages left to add: how many are left, and a button that shows a table of
 * what the next open slot offers in place, focused on its search box. Picking one runs `add`: the picker waits while it saves and shows a
 * failure beside it; once saved it closes and `added` fires, so the caller can place focus. Escape closes it unsaved
 * and returns focus to the button. Nothing while none are left.
 *
 * ```html
 * <pio-language-add [rows]="rows()" [open]="1" [add]="add" (added)="focusAfterAdd()" />
 * ```
 */
@Component({
  selector: 'pio-language-add',
  imports: [AsyncIndicator, Button, LanguagePicker, Message, Stack, Text, TranslocoPipe],
  templateUrl: './language-add.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageAdd {
  /** What the next open slot offers, with the facts to choose by. */
  public readonly rows = input<readonly LanguagePickerRow[]>([]);
  /** The content is still loading, so the table shows its loading state. */
  public readonly loading = input(false);
  /** How many languages the character has left to add at its level. */
  public readonly open = input(0);
  public readonly add = input<AddLanguage>(async () => undefined);
  public readonly added = output();

  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);
  protected readonly adding = signal(false);
  protected readonly Message = LanguagesMessage;
  protected readonly saving = injectAsyncAction((): AddLanguage => async (language) => this.add()(language), {
    onSuccess: () => {
      this.adding.set(false);
      this.added.emit();
    },
  });

  protected start(): void {
    this.saving.reset();
    this.adding.set(true);
    this.#focusAfterRender('pio-language-picker input');
  }

  protected pick(value: string | undefined): void {
    if (value !== undefined && value !== '') {
      this.saving.run(value);
    }
  }

  protected cancel(): void {
    if (!this.saving.isPending()) {
      this.adding.set(false);
      this.#focusAfterRender('fr-button button');
    }
  }

  #focusAfterRender(selector: string): void {
    afterNextRender(
      () => {
        this.#host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      },
      { injector: this.#injector },
    );
  }
}
