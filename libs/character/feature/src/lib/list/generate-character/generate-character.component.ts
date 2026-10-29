import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { form, FormField, max, min, validateStandardSchema } from '@angular/forms/signals';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN, CHARACTER_NAMES } from '@pioneer/character/domain';
import type { CharacterId, CharacterName, GenerationTheme, Seed } from '@pioneer/character/domain';
import {
  AsyncButton,
  AsyncForm,
  Grid,
  Heading,
  Link,
  NumberField,
  Select,
  Stack,
  Surface,
  Text,
  TextField,
  ToggleButton,
} from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import type { Attribute, WeaponCategory, WeaponGroup } from '@pioneer/rules/sdk';

import { CharacterGenerator } from '../../data/character-generator';
import { GenerateCharacterFields, GenerateCharacterForm } from '../../data/generate-character-form';
import { NO_THEME_CHOICE, themeOfChoice } from '../../data/generation-theme-choice';
import type { GenerationThemeChoice } from '../../data/generation-theme-choice';
import { RollTableInput } from '../../roll-table/roll-table-input.component';
import { THEME_ATTRIBUTES, WEAPON_CATEGORY_MESSAGES, WEAPON_GROUP_MESSAGES } from './generate-theme';

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
  /** The theme the character was made under; undefined when none was asked for. */
  readonly theme: GenerationTheme | undefined;
}

/** The key of `messages` that `picked` names, or undefined for no choice. */
function keyOf<TKey extends WeaponCategory | WeaponGroup>(
  messages: Readonly<Record<TKey, string>>,
  picked: string | undefined,
): TKey | undefined {
  return Object.keys(messages).find((value): value is TKey => value === picked);
}

/** Level a generated character starts at. */
const DEFAULT_LEVEL = CHARACTER_LEVEL_MIN;

/**
 * Makes a character at random: a level, an optional seed and a name rolled on the names table, and a theme that
 * favours attributes and a weapon. Neither the seed nor the theme is kept on the character, so the result shows them
 * once, with a link to the new sheet.
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
    Select,
    Stack,
    Surface,
    Text,
    TextField,
    ToggleButton,
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
  protected readonly themeAttributes = THEME_ATTRIBUTES;
  protected readonly themeChoice = signal<GenerationThemeChoice>(NO_THEME_CHOICE);
  protected readonly categoryOptions = computed(() => this.#options(WEAPON_CATEGORY_MESSAGES));
  protected readonly groupOptions = computed(() => this.#options(WEAPON_GROUP_MESSAGES));
  protected readonly result = signal<MadeCharacter | undefined>(undefined);

  protected readonly model = signal<GenerateModel>({ level: DEFAULT_LEVEL, seed: '', name: '' });
  protected readonly form = form(this.model, (path) => {
    validateStandardSchema(path, GenerateCharacterFields);
    min(path.level, CHARACTER_LEVEL_MIN);
    max(path.level, CHARACTER_LEVEL_MAX);
  });

  protected readonly generate = async (value: GenerateModel): Promise<void> => {
    const theme = themeOfChoice(this.themeChoice());
    const body = GenerateCharacterForm.parse(value);
    const { character, seed } = await this.#generator.generate(theme === undefined ? body : { ...body, theme });
    this.result.set({ id: character.id, name: character.name, seed, theme });
  };

  protected isFavoured(attribute: Attribute): boolean {
    return this.themeChoice().favoured.includes(attribute);
  }

  protected favour(attribute: Attribute, on: boolean): void {
    this.themeChoice.update((choice) => ({
      ...choice,
      favoured: on ? [...choice.favoured, attribute] : choice.favoured.filter((favoured) => favoured !== attribute),
    }));
  }

  protected chooseCategory(category: string | undefined): void {
    this.themeChoice.update((choice) => ({ ...choice, category: keyOf(WEAPON_CATEGORY_MESSAGES, category) }));
  }

  protected chooseGroup(group: string | undefined): void {
    this.themeChoice.update((choice) => ({ ...choice, group: keyOf(WEAPON_GROUP_MESSAGES, group) }));
  }

  /** The options of a weapon select: no choice first, then each value named by its message. */
  #options(messages: Readonly<Record<string, string>>): readonly SelectOption<string>[] {
    const none: SelectOption<string> = { value: '', label: this.#i18n.translate('character.list.theme.weaponNone') };
    return [none, ...Object.entries(messages).map(([value, key]) => ({ value, label: this.#i18n.translate(key) }))];
  }

  protected readonly describeError = (): string => this.#i18n.translate('character.list.generateFailed');
}
