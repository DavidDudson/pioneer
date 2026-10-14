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
import type { AddLanguage, LanguagePickerRow, RemoveLanguage } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { languageRows } from '../../data/language-rows';
import { sheetLanguages } from '../sheet-languages';
import type { SheetLanguages } from '../sheet-languages';
import { SheetState } from '../sheet-state';

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
  readonly #sheet = inject(SheetState);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #injector = inject(Injector);

  /** Undefined while the character loads. */
  protected readonly languages = computed((): SheetLanguages | undefined => {
    const read = this.#store.languages();
    return read === undefined ? undefined : sheetLanguages(read);
  });

  /** What the next open slot offers, with the facts to choose by; none while the content loads. */
  protected readonly rows = computed((): readonly LanguagePickerRow[] => {
    const registry = this.#sheet.registry.data();
    const languages = this.languages();
    return registry === undefined || languages === undefined
      ? []
      : languageRows(registry, languages.options, { known: new Set(languages.lines.map((line) => line.key)) });
  });

  protected readonly loading = computed(() => this.#sheet.registry.data() === undefined);

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
