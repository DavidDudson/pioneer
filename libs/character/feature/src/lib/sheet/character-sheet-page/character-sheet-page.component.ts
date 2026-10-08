import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import {
  CharacterId,
  CharacterLevelSchema,
  CharacterNameSchema,
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CharacterPatchField,
} from '@pioneer/character/domain';
import type { Character, CharacterPatch } from '@pioneer/character/domain';
import {
  DateDisplay,
  Grid,
  Heading,
  InlineEdit,
  InlineField,
  NumberInput,
  Page,
  Select,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextInput,
} from '@pioneer/frontier';
import {
  ATTRIBUTE_MODIFIER_MAX,
  ATTRIBUTE_MODIFIER_MIN,
  AncestryId,
  Attribute,
  AttributeModifierSchema,
} from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import type { z } from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';

const ATTRIBUTE_LABELS: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'Strength',
  [Attribute.Dexterity]: 'Dexterity',
  [Attribute.Constitution]: 'Constitution',
  [Attribute.Intelligence]: 'Intelligence',
  [Attribute.Wisdom]: 'Wisdom',
  [Attribute.Charisma]: 'Charisma',
};

/** How one sheet value maps to the aggregate and back. */
interface FieldSpec<TValue> {
  readonly read: (character: Character) => TValue;
  /** Draft placeholder while loading; never shown. */
  readonly empty: TValue;
  /** Shared domain schema, so client validation matches the server. */
  readonly schema: z.ZodType;
  readonly toPatch: (value: TValue) => CharacterPatch;
  readonly format?: (value: TValue) => string;
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/** Character sheet: every value is its own inline edit with its own state. */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    DateDisplay,
    Grid,
    Heading,
    InlineField,
    NumberInput,
    Page,
    Select,
    Skeleton,
    Stack,
    Surface,
    Text,
    TextInput,
  ],
  templateUrl: './character-sheet-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetPage {
  /** Route param, bound by `withComponentInputBinding`. */
  public readonly id = input.required<string>();

  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  protected readonly character = this.store.selected;
  protected readonly levelMin = CHARACTER_LEVEL_MIN;
  protected readonly levelMax = CHARACTER_LEVEL_MAX;
  protected readonly modifierMin = ATTRIBUTE_MODIFIER_MIN;
  protected readonly modifierMax = ATTRIBUTE_MODIFIER_MAX;
  protected readonly title = computed(() => this.character()?.name);

  protected readonly name = this.#field({
    read: (character) => character.name,
    empty: '',
    schema: CharacterNameSchema,
    toPatch: (value) => ({ field: CharacterPatchField.Name, value }),
  });
  protected readonly ancestry = this.#field<AncestryId | undefined>({
    read: (character) => character.ancestry,
    empty: undefined,
    schema: AncestryId,
    toPatch: (value) => ({ field: CharacterPatchField.Ancestry, value: AncestryId.parse(value) }),
    format: (value) => (value === undefined ? '' : this.ancestries.name(value)),
  });
  protected readonly level = this.#field({
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevelSchema,
    toPatch: (value) => ({ field: CharacterPatchField.Level, value }),
  });
  protected readonly attributes = Object.values(Attribute).map((attribute) => ({
    attribute,
    label: ATTRIBUTE_LABELS[attribute],
    edit: this.#field({
      read: (character) => character.modifier(attribute),
      empty: 0,
      schema: AttributeModifierSchema,
      toPatch: (value) => ({ field: CharacterPatchField.Attribute, attribute, value }),
      format: signed,
    }),
  }));

  public constructor() {
    effect(() => {
      this.store.select(CharacterId.parse(this.id()));
    });
  }

  #field<TValue>({ read, empty, schema, toPatch, format }: FieldSpec<TValue>): InlineEdit<TValue> {
    return new InlineEdit<TValue>({
      source: computed(() => {
        const character = this.character();
        return character === undefined ? undefined : read(character);
      }),
      empty,
      schema,
      save: async (value) => this.store.patch(toPatch(value)),
      isConflict: (error) => ApiError.isConflict(error),
      describeError: (error) =>
        ApiError.isConflict(error)
          ? 'Someone else changed this character. Showing their latest version.'
          : 'Could not save. Try again.',
      ...(format === undefined ? {} : { format }),
    });
  }
}
