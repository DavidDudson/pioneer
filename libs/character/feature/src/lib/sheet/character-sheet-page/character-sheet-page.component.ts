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
import type { Signal } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  CharacterId,
  CharacterLevel,
  CharacterName,
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CharacterPatchField,
  HERITAGE_SLOT,
} from '@pioneer/character/domain';
import type { InlineEdit, SelectOption } from '@pioneer/frontier';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  DateDisplay,
  Grid,
  Heading,
  InlineField,
  NumberInput,
  Page,
  Section,
  SectionIndex,
  SectionLink,
  Select,
  Skeleton,
  Stack,
  Surface,
  Text,
  TextInput,
} from '@pioneer/frontier';
import { ContentLoader } from '@pioneer/rules/data-access';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentId, SlotKey } from '@pioneer/rules/sdk';
import { AttributesView, BuildSummaryView, ChoicesView, DefencesView, StatisticsView } from '@pioneer/rules/ui';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';
import { CHARACTER_CONTENT_KINDS, contentRegistryQuery } from '../../data/content-registry-query';
import { ImportResult } from '../../import/import-result/import-result.component';
import { sheetAttributes } from '../sheet-attributes';
import { NOT_CHOSEN, RootPick, sheetBuildSummary, sheetRootOptions } from '../sheet-build';
import { sheetChoices } from '../sheet-choices';
import { sheetDefences } from '../sheet-defences';
import { sheetEntryNames } from '../sheet-entry-names';
import { sheetField } from '../sheet-field';
import { SHEET_SECTION_ORDER, SHEET_SECTIONS } from '../sheet-sections';
import { sheetStatistics } from '../sheet-statistics';

/** Focuses an inline field by its read view's button, which scrolls it into view. */
function focusField(field: ElementRef<HTMLElement>): void {
  field.nativeElement.querySelector<HTMLElement>('button')?.focus();
}

/**
 * Character sheet: fixed sections in page order, each a region under its level 2 heading, reached from the section
 * index. Every chosen value is its own inline edit with its own state. Attribute modifiers are worked out from the
 * boost picks, so they are read-only, with the boosts still to place listed beneath them. Choices lists every slot
 * with its status, flagging a planned or invalid pick where it would otherwise vanish.
 */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    AttributesView,
    BuildSummaryView,
    Button,
    ChoicesView,
    DateDisplay,
    DefencesView,
    Grid,
    Heading,
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

  readonly #injector = inject(Injector);
  readonly #content = inject(ContentLoader);
  readonly #i18n = inject(TranslocoService);
  private readonly identity = viewChild.required<string, ElementRef<HTMLElement>>('identity', { read: ElementRef });
  private readonly ancestryField = viewChild.required<string, ElementRef<HTMLElement>>('ancestryField', {
    read: ElementRef,
  });
  private readonly heritageField = viewChild.required<string, ElementRef<HTMLElement>>('heritageField', {
    read: ElementRef,
  });
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
  /** Every choice with its status, as the server read the slots; undefined while the character loads. */
  protected readonly choices = computed(() => {
    const slots = this.store.slots();
    return slots === undefined ? undefined : sheetChoices(slots);
  });
  /** Names for the entries the defences and statistics lines come from. */
  protected readonly entryNames = computed((): ReadonlyMap<ContentId, string> => {
    const registry = this.registry.data();
    return registry === undefined ? new Map() : sheetEntryNames(registry);
  });

  protected readonly name = sheetField<string>(this.character, {
    read: (character) => character.name,
    empty: '',
    schema: CharacterName,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Name, value: CharacterName.parse(value) }),
  });
  protected readonly ancestry = sheetField<AncestryId | undefined>(this.character, {
    read: (character) => character.ancestry,
    empty: undefined,
    schema: AncestryId,
    save: async (value) => this.store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse(AncestryId.parse(value))),
    format: (value) => this.ancestries.name(value),
  });
  protected readonly heritageOptions = computed(() => this.#rootOptions(HERITAGE_SLOT));
  protected readonly heritage = this.#rootField(HERITAGE_SLOT, this.heritageOptions);
  protected readonly backgroundOptions = computed(() => this.#rootOptions(BACKGROUND_SLOT));
  protected readonly background = this.#rootField(BACKGROUND_SLOT, this.backgroundOptions);
  protected readonly level = sheetField<number>(this.character, {
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevel,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(value) }),
  });
  /** What the character is, part by part; undefined while it or the content loads. */
  protected readonly buildLines = computed(() => {
    const registry = this.registry.data();
    const character = this.character();
    const slots = this.store.slots();
    return registry === undefined || character === undefined || slots === undefined
      ? undefined
      : sheetBuildSummary(registry, character, slots);
  });
  /** The heritage the last edit cleared, by name, until dismissed. */
  protected readonly cleared = computed(() =>
    this.store.cleared().map((pick) => ({ key: pick.key, name: pick.selectionName ?? pick.selection })),
  );

  public constructor() {
    effect(() => {
      this.store.select(this.id());
    });
  }

  /** Edit build goes to the pickers: focus lands on the ancestry, the first of them, and scrolls it into view. */
  protected editBuild(): void {
    focusField(this.ancestryField());
  }

  /** Dismissing removes the focused Dismiss button with the notice, so focus moves to the heritage picker it names. */
  protected dismissCleared(): void {
    this.store.dismissCleared();
    afterNextRender(
      () => {
        focusField(this.heritageField());
      },
      { injector: this.#injector },
    );
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

  /** The picker options of one of the character's own slots; none while it or the content loads. */
  #rootOptions(slot: SlotKey): readonly SelectOption<string>[] {
    const registry = this.registry.data();
    const character = this.character();
    return registry === undefined || character === undefined ? [] : sheetRootOptions(registry, character, slot);
  }

  /**
   * One of the character's own slots as an inline pick, named by its options. An empty one reads as `NOT_CHOSEN`,
   * never undefined, which the edit takes for still loading.
   */
  #rootField(slot: SlotKey, options: Signal<readonly SelectOption<string>[]>): InlineEdit<string | undefined> {
    return sheetField<string | undefined>(this.character, {
      read: (character) => character.document.build.choices[slot] ?? NOT_CHOSEN,
      empty: NOT_CHOSEN,
      schema: RootPick,
      save: async (value) =>
        value === undefined || value === NOT_CHOSEN
          ? this.store.clearSlot(slot)
          : this.store.selectSlot(slot, ChoiceValue.parse(value)),
      format: (value) =>
        options().find((option) => option.value === value)?.label ?? this.#i18n.translate('character.sheet.notChosen'),
    });
  }
}
