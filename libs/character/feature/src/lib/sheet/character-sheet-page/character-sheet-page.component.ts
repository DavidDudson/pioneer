import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  CharacterId,
  CharacterLevel,
  CharacterName,
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
  AttributeModifier,
} from '@pioneer/rules/sdk';
import { ApiError } from '@pioneer/shared/web';
import type { z } from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';

const ATTRIBUTE_LABEL_KEYS: Readonly<Record<Attribute, string>> = {
  [Attribute.Strength]: 'character.attribute.str',
  [Attribute.Dexterity]: 'character.attribute.dex',
  [Attribute.Constitution]: 'character.attribute.con',
  [Attribute.Intelligence]: 'character.attribute.int',
  [Attribute.Wisdom]: 'character.attribute.wis',
  [Attribute.Charisma]: 'character.attribute.cha',
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
    TranslocoPipe,
  ],
  templateUrl: './character-sheet-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetPage {
  /** Route param, bound by `withComponentInputBinding`. */
  public readonly id = input.required({ transform: (id: string): CharacterId => CharacterId.parse(id) });

  readonly #i18n = inject(TranslocoService);
  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  protected readonly character = this.store.selected;
  protected readonly levelMin = CHARACTER_LEVEL_MIN;
  protected readonly levelMax = CHARACTER_LEVEL_MAX;
  protected readonly modifierMin = ATTRIBUTE_MODIFIER_MIN;
  protected readonly modifierMax = ATTRIBUTE_MODIFIER_MAX;
  protected readonly title = computed(() => this.character()?.name);

  protected readonly name = this.#field<string>({
    read: (character) => character.name,
    empty: '',
    schema: CharacterName,
    toPatch: (value) => ({ field: CharacterPatchField.Name, value: CharacterName.parse(value) }),
  });
  protected readonly ancestry = this.#field<AncestryId | undefined>({
    read: (character) => character.ancestry,
    empty: undefined,
    schema: AncestryId,
    toPatch: (value) => ({ field: CharacterPatchField.Ancestry, value: AncestryId.parse(value) }),
    format: (value) => (value === undefined ? '' : this.ancestries.name(value)),
  });
  protected readonly level = this.#field<number>({
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevel,
    toPatch: (value) => ({ field: CharacterPatchField.Level, value: CharacterLevel.parse(value) }),
  });
  protected readonly attributes = Object.values(Attribute).map((attribute) => ({
    attribute,
    labelKey: ATTRIBUTE_LABEL_KEYS[attribute],
    edit: this.#field<number>({
      read: (character) => character.modifier(attribute),
      empty: 0,
      schema: AttributeModifier,
      toPatch: (value) => ({ field: CharacterPatchField.Attribute, attribute, value: AttributeModifier.parse(value) }),
      format: signed,
    }),
  }));

  public constructor() {
    effect(() => {
      this.store.select(this.id());
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
          ? this.#i18n.translate('character.sheet.conflict')
          : this.#i18n.translate('character.sheet.saveFailed'),
      ...(format === undefined ? {} : { format }),
    });
  }
}
