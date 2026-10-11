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
  CLASS_SLOT,
  HERITAGE_SLOT,
  itemContent,
} from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  DateDisplay,
  Grid,
  Heading,
  Message,
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
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import type { ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import {
  AttributesView,
  BuildSummaryView,
  ChoicesView,
  ClassFeaturesView,
  DefencesView,
  StatisticsView,
} from '@pioneer/rules/ui';
import type { Investment } from '@pioneer/rules/ui';

import { AncestryOptions } from '../../data/ancestry-options';
import { CharacterStore } from '../../data/character-store';
import { CHARACTER_CONTENT_KINDS, injectContentRegistry } from '../../data/content-registry-query';
import { ImportResult } from '../../import/import-result/import-result.component';
import { InventorySection } from '../inventory/inventory-section/inventory-section.component';
import { sheetAttributes } from '../sheet-attributes';
import { sheetBuildPicks } from '../sheet-build-picks';
import { SheetClassFields } from '../sheet-class-fields/sheet-class-fields.component';
import { sheetDefences } from '../sheet-defences';
import { sheetEntryNames } from '../sheet-entry-names';
import { carriesEquipment, EQUIPMENT_CONTENT_KINDS, sheetInvestments } from '../sheet-equipment';
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
    ClassFeaturesView,
    DateDisplay,
    DefencesView,
    Grid,
    Heading,
    ImportResult,
    Message,
    InlineField,
    InventorySection,
    NumberInput,
    Page,
    Section,
    SectionIndex,
    SectionLink,
    Select,
    SheetClassFields,
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
  protected readonly registry = injectContentRegistry(CHARACTER_CONTENT_KINDS);
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
  /**
   * The registry with the item kinds too, so the character's equipment reaches the engine. It loads only once the
   * character wears, holds or invests something, so a sheet with no equipment never fetches the item kinds for it.
   */
  protected readonly equipment = injectContentRegistry(EQUIPMENT_CONTENT_KINDS, () =>
    carriesEquipment(this.character()),
  );
  /** The registry the engine reads: with the item kinds once the character has equipment, undefined while they load. */
  readonly #engineRegistry = computed((): ContentRegistry | undefined =>
    carriesEquipment(this.character()) ? this.equipment.data() : this.registry.data(),
  );
  protected readonly statistics = computed(() => {
    const registry = this.#engineRegistry();
    const character = this.character();
    return registry === undefined || character === undefined ? undefined : sheetStatistics(registry, character);
  });
  /** The invested items and what each turns on, from the statistics; undefined while they load. */
  protected readonly investments = computed((): readonly Investment[] | undefined => {
    const registry = this.#engineRegistry();
    const character = this.character();
    const statistics = this.statistics();
    return registry === undefined || character === undefined || statistics === undefined
      ? undefined
      : sheetInvestments(character, itemContent(registry), statistics);
  });
  /** Names for the entries the defences and statistics lines come from. */
  protected readonly entryNames = computed((): ReadonlyMap<ContentId, string> => {
    const registry = this.#engineRegistry() ?? this.registry.data();
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
  /** The root slot, subclass and key attribute pickers, the build summary and the class features. */
  protected readonly picks = sheetBuildPicks({
    registry: this.registry.data,
    character: this.character,
    slots: this.store.slots,
    select: async (slot, selection) => this.store.selectSlot(slot, selection),
    clear: async (slot) => this.store.clearSlot(slot),
    translate: (key) => this.#i18n.translate(key),
  });
  protected readonly heritageOptions = this.picks.rootOptions(HERITAGE_SLOT);
  protected readonly heritage = this.picks.rootField(HERITAGE_SLOT, this.heritageOptions);
  protected readonly backgroundOptions = this.picks.rootOptions(BACKGROUND_SLOT);
  protected readonly background = this.picks.rootField(BACKGROUND_SLOT, this.backgroundOptions);
  protected readonly classOptions = this.picks.rootOptions(CLASS_SLOT);
  protected readonly characterClass = this.picks.rootField(CLASS_SLOT, this.classOptions);
  protected readonly level = sheetField<number>(this.character, {
    read: (character) => character.level,
    empty: CHARACTER_LEVEL_MIN,
    schema: CharacterLevel,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Level, value: CharacterLevel.parse(value) }),
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
}
