import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Section, SectionIndex, SectionLink, Stack } from '@pioneer/frontier';
import { DefencesView, SpellcastingView, StatisticsMessage, StatisticsView } from '@pioneer/rules/ui';

import { SHEET_SECTIONS, SHEET_TAB_SECTIONS } from '../sheet-sections';
import { SheetSkillFields } from '../sheet-skill-fields/sheet-skill-fields.component';
import { SheetSpells } from '../sheet-spells/sheet-spells.component';
import { SheetState } from '../sheet-state';
import { rememberTab } from '../sheet-tab';

/**
 * The Encounter tab: what the character does in a fight. Its defences, every skill and Lore with its total and the
 * pickers for trained skills and skill increases, its Strikes, and its spellcasting with the spells it knows or
 * prepares. Actions and usable items join as their stories land.
 */
@Component({
  selector: 'pio-sheet-encounter-tab',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DefencesView,
    Section,
    SectionIndex,
    SectionLink,
    SheetSkillFields,
    SheetSpells,
    SpellcastingView,
    Stack,
    StatisticsView,
    TranslocoPipe,
  ],
  templateUrl: './sheet-encounter-tab.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEncounterTab {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  protected readonly sections = SHEET_SECTIONS;
  protected readonly statisticsMessage = StatisticsMessage;
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Encounter];

  public constructor() {
    rememberTab(SheetMode.Encounter);
  }
}
