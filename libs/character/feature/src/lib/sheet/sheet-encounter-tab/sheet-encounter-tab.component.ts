import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetMode, TurnPhase } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Rail, Section, Stack } from '@pioneer/frontier';
import { ActionMode, SpellPreparation } from '@pioneer/rules/sdk';
import { DefencesView, ENTRY_PREVIEWS, SensesView, SkillsView, SpellcastingView, StrikesView } from '@pioneer/rules/ui';
import type { EntryPreviews, NamedStrike } from '@pioneer/rules/ui';

import { SheetActions } from '../sheet-actions/sheet-actions.component';
import { SheetConsumables } from '../sheet-consumables/sheet-consumables.component';
import { SheetRituals } from '../sheet-rituals/sheet-rituals.component';
import { SheetSectionTabs } from '../sheet-section-tabs/sheet-section-tabs.component';
import { SHEET_SECTIONS, SHEET_TAB_SECTIONS, shownSection } from '../sheet-sections';
import { SheetShields } from '../sheet-shields/sheet-shields.component';
import { SheetSpells } from '../sheet-spells/sheet-spells.component';
import { SheetSpendLog } from '../sheet-spend-log/sheet-spend-log.component';
import { SheetSpender } from '../sheet-spender';
import { SheetState } from '../sheet-state';
import { SheetStaves } from '../sheet-staves/sheet-staves.component';
import { usableStrikes } from '../sheet-strikes';
import { rememberTab } from '../sheet-tab';
import { SheetTurnPanel } from '../sheet-turn-panel/sheet-turn-panel.component';
import { SheetWands } from '../sheet-wands/sheet-wands.component';

/**
 * The Encounter tab: what the character does in a fight. Its defences, every skill and Lore with its total, in a rail
 * that stays in view, its Strikes, and its spellcasting with the spells it knows or prepares. Actions and usable items
 * join as their stories land.
 */
@Component({
  selector: 'pio-sheet-encounter-tab',
  imports: [
    SheetSectionTabs,
    SheetActions,
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DefencesView,
    SensesView,
    Section,
    Rail,
    SkillsView,
    SheetRituals,
    SheetSpells,
    SheetStaves,
    SheetSpendLog,
    SheetTurnPanel,
    SheetConsumables,
    SheetShields,
    SheetWands,
    SpellcastingView,
    Stack,
    StrikesView,
    TranslocoPipe,
  ],
  templateUrl: './sheet-encounter-tab.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetState).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetEncounterTab {
  protected readonly sheet = inject(SheetState);
  protected readonly picks = this.sheet.picks;
  readonly #spender = inject(SheetSpender);
  protected readonly sections = SHEET_SECTIONS;
  protected readonly Mode = ActionMode.Encounter;
  /** The index leaves out Skills, which stays in view in the rail beside the tab. */
  /** The section the route names, bound from the route's `:section` parameter. */
  public readonly section = input<string>();
  protected readonly sectionOrder = SHEET_TAB_SECTIONS[SheetMode.Encounter].filter(
    (section) => section !== SHEET_SECTIONS.skills,
  );
  protected readonly shown = shownSection(this.sectionOrder, this.section);
  /** The Strikes with what using each spends, those the turn has no action for left out of reach. */
  protected readonly strikes = computed((): readonly NamedStrike[] | undefined => {
    const strikes = this.picks.strikes();
    return strikes === undefined ? undefined : usableStrikes(strikes, this.#spender.turn());
  });
  /** The attacks made this turn, which mark the next step of the multiple attack penalty; undefined when no turn is running. */
  protected readonly attacksMade = computed((): number | undefined => {
    const turn = this.#spender.turn();
    return turn?.phase === TurnPhase.Turn ? turn.attacks : undefined;
  });
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
