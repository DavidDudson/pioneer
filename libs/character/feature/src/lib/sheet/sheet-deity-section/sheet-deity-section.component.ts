import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { injectTranslate, InlineField, Stack } from '@pioneer/frontier';
import type { InlineEdit } from '@pioneer/frontier';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { DeityPicker, DeityView } from '@pioneer/rules/ui';
import type { DeityLine, DeityPickerRow } from '@pioneer/rules/ui';

import { CharacterStore } from '../../data/character-store';
import { sheetDeityLine, sheetDeityRows } from '../sheet-deity';
import { SheetState } from '../sheet-state';

/**
 * The Deity section's content (#469): the deity picker, a table of what decides the choice with No deity first, and
 * the deity the server read for the character, with what it grants, its favoured weapons and its edicts and anathema.
 * A cleric needs one, which the Choices section says; any character may have one.
 */
@Component({
  selector: 'pio-sheet-deity-section',
  imports: [DeityPicker, DeityView, InlineField, Stack, TranslocoPipe],
  templateUrl: './sheet-deity-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetDeitySection {
  readonly #store = inject(CharacterStore);
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  /** Changes when the language changes or the messages load, so the labels below are read again. */
  readonly #messages = injectTranslate();

  /** The deity slot as an inline pick. */
  public readonly field = input.required<InlineEdit<string | undefined>>();
  /** The loaded content, for the divine skills' names. */
  public readonly registry = input.required<ContentRegistry>();

  protected readonly rows = computed((): ReadonlyArray<DeityPickerRow> => {
    this.#messages();
    const character = this.#sheet.character();

    return character === undefined
      ? []
      : sheetDeityRows(this.registry(), character, {
          translate: (key) => this.#i18n.translate(key),
          unlistedWeapon: (weapon) => this.#i18n.translate('character.sheet.deity.unlistedWeapon', { weapon }),
        });
  });
  protected readonly loading = computed(() => this.#store.slots() === undefined);
  protected readonly line = computed((): DeityLine | undefined => {
    this.#messages();
    const deity = this.#store.deity();
    const registry = this.registry();

    return deity === undefined
      ? undefined
      : sheetDeityLine(deity, {
          registry,
          unlistedWeapon: (weapon) => this.#i18n.translate('character.sheet.deity.unlistedWeapon', { weapon }),
        });
  });
}
