import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SheetMode, TurnPhase } from '@pioneer/character/domain';
import { AsyncData, AsyncPending, AsyncRegion, Section, SectionBody, Stack } from '@pioneer/frontier';
import { ActionMode } from '@pioneer/rules/sdk';
import { DefencesView, ENTRY_PREVIEWS, SensesView, SpellcastingView, StrikesView } from '@pioneer/rules/ui';
import type { EntryPreviews, NamedStrike } from '@pioneer/rules/ui';

import { SheetActions } from '../sheet-actions/sheet-actions.component';
import { SheetCastItems } from '../sheet-cast-items/sheet-cast-items.component';
import { SheetConsumables } from '../sheet-consumables/sheet-consumables.component';
import { encounterSections } from '../sheet-encounter-sections';
import { SheetFamiliarSection } from '../sheet-familiar-section/sheet-familiar-section.component';
import { SheetSectionTabs } from '../sheet-section-tabs/sheet-section-tabs.component';
import { SheetShields } from '../sheet-shields/sheet-shields.component';
import { SheetSpells } from '../sheet-spells/sheet-spells.component';
import { SheetSpendLog } from '../sheet-spend-log/sheet-spend-log.component';
import { SheetSpender } from '../sheet-spender';
import { SheetState } from '../sheet-state';
import { usableStrikes } from '../sheet-strikes';
import { rememberTab } from '../sheet-tab';
import { SheetTurnPanel } from '../sheet-turn-panel/sheet-turn-panel.component';

/**
 * The Encounter tab: what the character does in a fight. Its defences, its Strikes, and its spellcasting with the
 * spells it knows or prepares. Actions and usable items join as their stories land.
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
    SectionBody,
    SheetCastItems,
    SheetFamiliarSection,
    SheetSpells,
    SheetSpendLog,
    SheetTurnPanel,
    SheetConsumables,
    SheetShields,
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
  protected readonly Mode = ActionMode.Encounter;
  /** The section the route names, bound from the route's `:section` parameter. */
  public readonly section = input<string>();
  readonly #tabSections = encounterSections(this.section);
  protected readonly sections = this.#tabSections.sections;
  protected readonly sectionOrder = this.#tabSections.order;
  protected readonly shown = this.#tabSections.shown;
  /** The Strikes with what using each spends, those the turn has no action for left out of reach. */
  protected readonly strikes = computed((): ReadonlyArray<NamedStrike> | undefined => {
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

  public constructor() {
    rememberTab(SheetMode.Encounter);
  }
}
