import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CharacterPatchField, CharacterProseInput, formTraits, itemContent } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { InlineField, Stack, Text, TextArea } from '@pioneer/frontier';
import type { InlineEdit } from '@pioneer/frontier';

import { sheetField } from '../sheet-field';
import { proseToRichText, richTextToProse } from '../sheet-prose';
import { sheetSlotContent } from '../sheet-slot-content';
import { SheetState } from '../sheet-state';

/** Visible lines of an open appearance or personality editor. */
const EDITOR_ROWS = 6;

/** The prose fields the section edits: the patch that writes one and where the document keeps it. */
type ProseField = typeof CharacterPatchField.SetAppearance | typeof CharacterPatchField.SetPersonality;

/**
 * The appearance and personality of the character, for the Exploration tab (#500): each its own inline editor over
 * plain text, saved as rich text paragraphs. An empty field reads as not written yet.
 */
@Component({
  selector: 'pio-sheet-roleplay-section',
  imports: [InlineField, Stack, Text, TextArea, TranslocoPipe],
  templateUrl: './sheet-roleplay-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRoleplaySection {
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  protected readonly rows = EDITOR_ROWS;
  /** The name of the form the character is in: the appearance below is their own, not the form's. */
  protected readonly form = computed((): string | undefined => this.#sheet.activeForm()?.name);

  /** The traits the form gives, which is how it looks to the rules: shown above the character's own appearance (#532). */
  protected readonly formTraits = computed((): string => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    return registry === undefined || character === undefined
      ? ''
      : formTraits(character.document, itemContent(registry), sheetSlotContent(registry)).join(', ');
  });

  protected readonly appearance = this.#prose(
    (character) => richTextToProse(character.document.appearance),
    CharacterPatchField.SetAppearance,
  );
  protected readonly personality = this.#prose(
    (character) => richTextToProse(character.document.personality),
    CharacterPatchField.SetPersonality,
  );

  #prose(read: (character: Character) => string, field: ProseField): InlineEdit<string> {
    return sheetField<string>(this.#sheet.character, {
      read,
      empty: '',
      schema: CharacterProseInput,
      save: async (value) =>
        this.#sheet.store.patch({ field, value: proseToRichText(CharacterProseInput.parse(value)) }),
      format: (value) => (value === '' ? this.#i18n.translate('character.sheet.roleplay.empty') : value),
    });
  }
}
