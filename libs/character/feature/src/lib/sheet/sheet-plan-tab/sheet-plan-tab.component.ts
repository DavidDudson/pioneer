import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  ANCESTRY_SLOT,
  BACKGROUND_SLOT,
  CharacterLevel,
  CharacterName,
  CHARACTER_LEVEL_MAX,
  CHARACTER_LEVEL_MIN,
  CharacterPatchField,
  CLASS_SLOT,
  HERITAGE_SLOT,
  SheetMode,
} from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  Button,
  Grid,
  Heading,
  InlineField,
  Message,
  NumberInput,
  Section,
  SectionIndex,
  SectionLink,
  Select,
  Stack,
  Surface,
  TextInput,
} from '@pioneer/frontier';
import { AncestryId, ChoiceValue } from '@pioneer/rules/sdk';
import { AttributesView, BuildSummaryView, ChoicesView, ClassFeaturesView } from '@pioneer/rules/ui';

import { AncestryOptions } from '../../data/ancestry-options';
import { ImportResult } from '../../import/import-result/import-result.component';
import { SheetClassFields } from '../sheet-class-fields/sheet-class-fields.component';
import { SheetFeats } from '../sheet-feats/sheet-feats.component';
import { sheetField } from '../sheet-field';
import { SheetLevelPlan } from '../sheet-level-plan/sheet-level-plan.component';
import { SheetPacks } from '../sheet-packs/sheet-packs.component';
import { SheetPickFields } from '../sheet-pick-fields/sheet-pick-fields.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import { SheetState } from '../sheet-state';
import { rememberTab } from '../sheet-tab';

/** Focuses an inline field by its read view's button, which scrolls it into view. */
function focusField(field: ElementRef<HTMLElement>): void {
  field.nativeElement.querySelector<HTMLElement>('button')?.focus();
}

/**
 * The Plan tab: who the character is mechanically. Its identity pickers, the build summary, attributes worked out
 * from the boost picks with the boosts still to place, every choice with its status, and the class features. A
 * just-imported character's report shows first, and a heritage the last edit cleared is named until dismissed.
 */
@Component({
  selector: 'pio-sheet-plan-tab',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    AttributesView,
    BuildSummaryView,
    Button,
    ChoicesView,
    ClassFeaturesView,
    Grid,
    Heading,
    ImportResult,
    InlineField,
    Message,
    NumberInput,
    Section,
    SectionIndex,
    SectionLink,
    Select,
    SheetClassFields,
    SheetFeats,
    SheetLevelPlan,
    SheetPacks,
    SheetPickFields,
    Stack,
    Surface,
    TextInput,
    TranslocoPipe,
  ],
  templateUrl: './sheet-plan-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetPlanTab {
  readonly #injector = inject(Injector);
  private readonly identity = viewChild.required<string, ElementRef<HTMLElement>>('identity', { read: ElementRef });
  private readonly ancestryField = viewChild.required<string, ElementRef<HTMLElement>>('ancestryField', {
    read: ElementRef,
  });
  private readonly heritageField = viewChild.required<string, ElementRef<HTMLElement>>('heritageField', {
    read: ElementRef,
  });
  protected readonly sheet = inject(SheetState);
  protected readonly store = this.sheet.store;
  protected readonly ancestries = inject(AncestryOptions);
  protected readonly picks = this.sheet.picks;
  protected readonly registry = this.sheet.registry;
  protected readonly levelMin = CHARACTER_LEVEL_MIN;
  protected readonly levelMax = CHARACTER_LEVEL_MAX;
  protected readonly sections = SHEET_SECTIONS;
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Plan];

  protected readonly name = sheetField<string>(this.sheet.character, {
    read: (character) => character.name,
    empty: '',
    schema: CharacterName,
    save: async (value) => this.store.patch({ field: CharacterPatchField.Name, value: CharacterName.parse(value) }),
  });
  protected readonly ancestry = sheetField<AncestryId | undefined>(this.sheet.character, {
    read: (character) => character.ancestry,
    empty: undefined,
    schema: AncestryId,
    save: async (value) => this.store.selectSlot(ANCESTRY_SLOT, ChoiceValue.parse(AncestryId.parse(value))),
    format: (value) => this.ancestries.name(value),
  });
  protected readonly heritageOptions = this.picks.rootOptions(HERITAGE_SLOT);
  protected readonly heritage = this.picks.rootField(HERITAGE_SLOT, this.heritageOptions);
  protected readonly backgroundOptions = this.picks.rootOptions(BACKGROUND_SLOT);
  protected readonly background = this.picks.rootField(BACKGROUND_SLOT, this.backgroundOptions);
  protected readonly classOptions = this.picks.rootOptions(CLASS_SLOT);
  protected readonly characterClass = this.picks.rootField(CLASS_SLOT, this.classOptions);
  protected readonly level = sheetField<number>(this.sheet.character, {
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
    rememberTab(SheetMode.Plan);
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
