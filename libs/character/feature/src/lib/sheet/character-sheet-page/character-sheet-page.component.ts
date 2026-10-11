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
  ANCESTRY_SLOT,
  CharacterId,
  CharacterLevel,
  CharacterName,
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CharacterPatchField,
} from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Grid,
  InlineEdit,
  InlineField,
  NumberInput,
  Page,
  Section,
  SectionIndex,
  SectionLink,
  Select,
  Skeleton,
  Stack,
  Text,
  TextInput,
} from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { AttributesView, DefencesView, StatisticsView } from '@pioneer/rules/ui';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type * as z from 'zod';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';
import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from '../../data/content-registry-query';
import { ImportResult } from '../../import/import-result/import-result.component';
import { sheetAttributes } from '../sheet-attributes';
import { sheetDefences } from '../sheet-defences';
import { sheetEntryNames } from '../sheet-entry-names';
import { SHEET_SECTION_ORDER, SHEET_SECTIONS } from '../sheet-sections';
import { sheetStatistics } from '../sheet-statistics';

/** How one sheet value maps to the aggregate and back. */
interface FieldSpec<TValue> {
  readonly read: (character: Character) => TValue;
  /** Draft placeholder while loading; never shown. */
  readonly empty: TValue;
  /** Shared domain schema, so client validation matches the server. */
  readonly schema: z.ZodType;
  /** Sends the edit: a patch, or a slot pick. */
  readonly save: (value: TValue) => Promise<void>;
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

/**
 * Character sheet: fixed sections in page order, each a region under its level 2 heading, reached from the section
 * index. Every chosen value is its own inline edit with its own state. Attribute modifiers are worked out from the
 * boost picks, so they are read-only, with the boosts still to place listed beneath them.
 */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    AttributesView,
    DefencesView,
    Grid,
    ImportResult,
    InlineField,
    NumberInput,
    Page,
    Section,
    SectionIndex,
    SectionLink,
    Select,
    Skeleton,
    Stack,
    StatisticsView,
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

  readonly #injector = inject(Injector);
  readonly #content = inject(ContentLoader);
  private readonly identity = viewChild.required<string, ElementRef<HTMLElement>>('identity', { read: ElementRef });
  protected readonly store = inject(CharacterStore);
  protected readonly ancestries = inject(AncestryOptions);
  protected readonly character = this.store.selected;
  protected readonly levelMin = CHARACTER_LEVEL_MIN;
  protected readonly levelMax = CHARACTER_LEVEL_MAX;
  protected readonly sections = SHEET_SECTIONS;
  protected readonly sectionOrder = SHEET_SECTION_ORDER;
  protected readonly title = computed(() => this.character()?.name);
  /** The registry the engine reads, shared with the ancestry options, so it loads once. */
  protected readonly registry = injectQuery(() => contentRegistryQuery(this.#content, CHARACTER_CONTENT_KINDS));
  protected readonly attributeView = computed(() => {
    const registry = this.registry.data();
    const character = this.character();
    return registry === undefined || character === undefined ? undefined : sheetAttributes(registry, character);
  });
  protected readonly defences = computed(() => {
    const registry = this.registry.data();
    const character = this.character();
    return registry === undefined || character === undefined ? undefined : sheetDefences(registry, character);
  });
  protected readonly statistics = computed(() => {
    const registry = this.registry.data();
    const character = this.character();
    return registry === undefined || character === undefined ? undefined : sheetStatistics(registry, character);
  });
  /** Names for the entries the defences and statistics lines come from. */
  protected readonly entryNames = computed((): ReadonlyMap<ContentId, string> => {
    const registry = this.registry.data();
    return registry === undefined ? new Map() : sheetEntryNames(registry);
  });

  protected readonly name = this.#field<string>({
    read: (character) => character.name,
    empty: '',
    schema: CharacterName,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Name, value: CharacterName.parse(value) }),
  });
  protected readonly ancestry = this.#field<AncestryId | undefined>({
    read: (character) => character.ancestry,
    empty: undefined,
    schema: AncestryId,
    save: async (value) => this.store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse(AncestryId.parse(value))),
    format: (value) => this.ancestries.name(value),
  });
  protected readonly level = this.#field<number>({
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevel,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(value) }),
  });
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

  #field<TValue>({ read, empty, schema, save, format }: FieldSpec<TValue>): InlineEdit<TValue> {
    return new InlineEdit<TValue>({
      source: computed(() => {
        const character = this.character();
        return character === undefined ? undefined : read(character);
      }),
      empty,
      schema,
      save,
      isConflict: (error) => ApiError.isConflict(error),
      describeError: describeSaveError,
      ...(format === undefined ? {} : { format }),
    });
  }
}
