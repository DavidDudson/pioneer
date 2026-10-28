import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { form, FormField, max, min, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN, CHARACTER_NAMES } from '@pioneer/character/domain';
import type { CharacterId, CharacterName, Seed } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  Grid,
  Heading,
  Link,
  NumberField,
  Stack,
  Surface,
  Text,
  TextField,
} from '@pioneer/frontier';

import { CharacterGenerator } from '../../data/character-generator';
import { GenerateCharacterFields, GenerateCharacterForm } from '../../data/generate-character-form';
import { RollTableInput } from '../../roll-table/roll-table-input.component';

interface GenerateModel {
  readonly level: number;
  readonly seed: string;
  readonly name: string;
}

/** A character that was just generated, as the card reports it. */
interface MadeCharacter {
  readonly id: CharacterId;
  readonly name: CharacterName;
  readonly seed: Seed;
}

/** Level a generated character starts at. */
const DEFAULT_LEVEL = CHARACTER_LEVEL_MIN;

/**
 * Makes a character at random: a level, an optional seed and a name rolled on the names table. The seed is not
 * kept on the character, so the result shows it once, with a link to the new sheet.
 */
@Component({
  selector: 'pio-generate-character',
  imports: [
    AsyncButton,
    AsyncForm,
    FormField,
    Grid,
    Heading,
    Link,
    NumberField,
    RollTableInput,
    Stack,
    Surface,
    Text,
    TextField,
    TranslocoPipe,
  ],
  templateUrl: './generate-character.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenerateCharacter {
  readonly #generator = inject(CharacterGenerator);
  readonly #i18n = inject(TranslocoService);

  /** Whether the names table is open in the page's drawer; the page binds it. */
  public readonly namesOpen = model(false);

  protected readonly names = CHARACTER_NAMES;
  protected readonly result = signal<MadeCharacter | undefined>(undefined);

  protected readonly model = signal<GenerateModel>({ level: DEFAULT_LEVEL, seed: '', name: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, GenerateCharacterFields);
    min(path.level, CHARACTER_LEVEL_MIN);
    max(path.level, CHARACTER_LEVEL_MAX);
  });

  protected readonly generate = async (value: GenerateModel): Promise<void> => {
    const body = GenerateCharacterForm.parse(value);
    const { character, seed } = await this.#generator.generate(body);
    this.result.set({ id: character.id, name: character.name, seed });
  };

  protected readonly describeError = (): string => this.#i18n.translate('character.list.generateFailed');
}
