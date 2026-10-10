import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
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
  LocaleFormat,
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
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';
import type * as z from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { ATTRIBUTE_LABEL_KEYS } from '../../data/attribute-label-keys';
import { CharacterStore } from '../../data/character-store';
import { ImportResult } from '../../import/import-result/import-result.component';

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

/** A rejected save: the server's field issue when it sent one, else the sheet's own wording. */
function describeSaveError(error: unknown): MessageDescriptor {
  if (ApiError.isConflict(error)) {
    return message('character.sheet.conflict');
  }
  const [issue] = error instanceof ApiError ? error.issues : [];
  return issue?.message ?? message('character.sheet.saveFailed');
}

/** PF2e modifiers always show their sign, `+0` included. */
const SIGNED: Intl.NumberFormatOptions = { signDisplay: 'always' };

/** Character sheet: every value is its own inline edit with its own state. */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    DateDisplay,
    Grid,
    Heading,
    ImportResult,
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

  readonly #format = inject(LocaleFormat);
  readonly #injector = inject(Injector);
  private readonly identity = viewChild.required<string, ElementRef<HTMLElement>>('identity', { read: ElementRef });
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
      format: (value) => this.#format.number(value, SIGNED),
    }),
  }));

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }

  /**
   * Dismissing removes the focused Dismiss button with the report, so focus moves to the first identity field rather
   * than falling to the page body.
   */
  protected dismissImportReport(): void {
    this.store.dismissImportReport();
    afterNextRender(
      () => {
        this.identity().nativeElement.querySelector<HTMLElement>('button')?.focus();
      },
      { injector: this.#injector },
    );
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
      describeError: describeSaveError,
      ...(format === undefined ? {} : { format }),
    });
  }
}
