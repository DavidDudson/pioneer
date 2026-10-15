import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Section, SectionIndex, SectionLink, Stack } from '@pioneer/frontier';
import { ActionMode, SpellPreparation } from '@pioneer/rules/sdk';
import { DefencesView, SpellcastingView, StatisticsView, StrikesView } from '@pioneer/rules/ui';

import { SheetActions } from '../sheet-actions/sheet-actions.component';
import { SheetPickFields } from '../sheet-pick-fields/sheet-pick-fields.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import { SheetSpells } from '../sheet-spells/sheet-spells.component';
import { SheetState } from '../sheet-state';
import { SheetStaves } from '../sheet-staves/sheet-staves.component';
import { rememberTab } from '../sheet-tab';
import { SheetWands } from '../sheet-wands/sheet-wands.component';

/**
 * The Encounter tab: what the character does in a fight. Its defences, every skill and Lore with its total and the
 * pickers for trained skills and skill increases, its Strikes, and its spellcasting with the spells it knows or
 * prepares. Actions and usable items join as their stories land.
 */
@Component({
  selector: 'pio-sheet-encounter-tab',
  imports: [
    SheetActions,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DefencesView,
    Section,
    SectionIndex,
    SectionLink,
    SheetPickFields,
    SheetSpells,
    SheetStaves,
    SheetWands,
    SpellcastingView,
    Stack,
    StatisticsView,
    StrikesView,
    TranslocoPipe,
  ],
  templateUrl: './sheet-encounter-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEncounterTab {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  protected readonly sections = SHEET_SECTIONS;
  protected readonly Mode = ActionMode.Encounter;
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Encounter];
  /** Whether the character has a spellcasting entry, so its spell picks load. */
  protected readonly casts = computed(() => (this.picks.spellcasting()?.length ?? 0) > 0);
  /** Whether one of its entries is a focus entry. */
  protected readonly focuses = computed(
    () => this.picks.spellcasting()?.some((entry) => entry.preparation === SpellPreparation.Focus) ?? false,
  );

  public constructor() {
    rememberTab(SheetMode.Encounter);
  }
}
