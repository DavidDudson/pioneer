import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
} from '@angular/core';
import { Stack } from '@pioneer/frontier';
import { ChoiceValue, SlotKey } from '@pioneer/rules/sdk';
import { LanguageAdd, LanguagesView } from '@pioneer/rules/ui';
import type { AddLanguage, RemoveLanguage } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { sheetLanguages } from '../sheet-languages';
import type { SheetLanguages } from '../sheet-languages';

/**
 * The Languages section's content (#470): the languages the character knows as the server read them, a picked one
 * removable, and Add language while slots up to its level are open, which fills the next one. After either edit,
 * focus moves to Add language, or to the last Remove when none are left to add, never to the page.
 */
@Component({
  selector: 'pio-sheet-languages-section',
  imports: [LanguageAdd, LanguagesView, Stack],
  templateUrl: './sheet-languages-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLanguagesSection {
  readonly #store = inject(CharacterStore);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);

  /** Undefined while the character loads. */
  protected readonly languages = computed((): SheetLanguages | undefined => {
    const read = this.#store.languages();
    return read === undefined ? undefined : sheetLanguages(read);
  });

  protected readonly add: AddLanguage = async (selection) => {
    const slot = this.languages()?.next;
    if (slot !== undefined) {
      await this.#store.selectSlot(slot, ChoiceValue.parse(selection));
    }
  };

  protected readonly remove: RemoveLanguage = async (slot) => {
    await this.#store.clearSlot(SlotKey.parse(slot));
    this.focusAfterEdit();
  };

  /** Add language once the edit renders, or the last Remove when none are left to add. */
  protected focusAfterEdit(): void {
    afterNextRender(
      () => {
        const host = this.#host.nativeElement;
        const add = host.querySelector<HTMLElement>('pio-language-add fr-button button');
        const removes = [...host.querySelectorAll<HTMLElement>('pio-languages fr-async-button button')];
        (add ?? removes.at(-1))?.focus();
      },
      { injector: this.#injector },
    );
  }
}
