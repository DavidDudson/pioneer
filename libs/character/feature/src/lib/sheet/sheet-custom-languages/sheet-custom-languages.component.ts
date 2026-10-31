import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterPatchField } from '@pioneer/character/domain';
import type { LanguageName } from '@pioneer/character/domain';
import { AsyncButton, Badge, BadgeTone, Heading, List, ListItem, Stack, Text } from '@pioneer/frontier';

import { CharacterStore } from '../../data/character-store';

/**
 * The languages an import named that no loaded content defines (#1595): kept by name, so nothing is lost, and never
 * counted against a slot. Remove takes one off. Nothing shows when there are none.
 */
@Component({
  selector: 'pio-sheet-custom-languages',
  imports: [AsyncButton, Badge, Heading, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-custom-languages.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCustomLanguages {
  readonly #store = inject(CharacterStore);
  protected readonly Tone = BadgeTone;

  protected readonly names: Signal<readonly LanguageName[]> = computed(
    () => this.#store.selected()?.document.build.customLanguages ?? [],
  );

  protected readonly remove = (language: LanguageName) => async (): Promise<void> =>
    this.#store.patch({ field: CharacterPatchField.RemoveCustomLanguage, language });
}
