import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  DateDisplay,
  Page,
  PageBody,
  PageHeader,
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Text,
} from '@pioneer/frontier';
import { VitalsView } from '@pioneer/rules/ui';

import { FeatDisplayStore } from '../../data/feat-display-store';
import { CHARACTER_CONTENT_PROVIDERS } from '../../data/source-packs';
import { SheetActiveEnvironments } from '../sheet-active-environments/sheet-active-environments.component';
import { SheetConditions } from '../sheet-conditions/sheet-conditions.component';
import { SheetCounted } from '../sheet-counted/sheet-counted.component';
import { SheetDeathTrack } from '../sheet-death-track/sheet-death-track.component';
import { SheetDrawers } from '../sheet-drawers/sheet-drawers.component';
import { SheetForm } from '../sheet-form/sheet-form.component';
import { SheetHeaderActions } from '../sheet-header-actions/sheet-header-actions.component';
import { SheetHitPoints } from '../sheet-hit-points/sheet-hit-points.component';
import { SheetLastRoll } from '../sheet-last-roll/sheet-last-roll.component';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SHEET_ROLLS_PROVIDERS } from '../sheet-rolls';
import { SHEET_TABS } from '../sheet-sections';
// oxlint-disable-next-line import/max-dependencies -- the page that gathers every region of the sheet, and its side panel
import { SheetSidePanelState } from '../sheet-side-panel/sheet-side-panel-state';
import { SheetSidePanelHost } from '../sheet-side-panel/sheet-side-panel.component';
import { SHEET_PLAY_PROVIDERS } from '../sheet-spender';
import { SheetState } from '../sheet-state';

/**
 * Character sheet: one character under four tabs (play-and-campaigns.md, Sheet modes), each its own route below the
 * character's. The header is the same on every tab: the character's name, a one-line identity, how its edits stand,
 * and the vitals row; then the tabs, then the open tab's sections. The character's own address opens the tab the user
 * last had open on it, Plan the first time.
 */
@Component({
  selector: 'pio-character-sheet-page',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    DateDisplay,
    Page,
    PageBody,
    PageHeader,
    RouterOutlet,
    SheetDeathTrack,
    SheetActiveEnvironments,
    SheetConditions,
    SheetCounted,
    SheetForm,
    SheetHeaderActions,
    SheetResources,
    SheetHitPoints,
    SheetLastRoll,
    SheetDrawers,
    SheetSidePanelHost,
    Skeleton,
    Stack,
    Tab,
    Tabs,
    Text,
    TranslocoPipe,
    VitalsView,
  ],
  templateUrl: './character-sheet-page.component.html',
  providers: [
    SheetSidePanelState,
    SheetState,
    ...SHEET_PLAY_PROVIDERS,
    FeatDisplayStore,
    ...CHARACTER_CONTENT_PROVIDERS,
    ...SHEET_ROLLS_PROVIDERS,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CharacterSheetPage {
  /** Route param, bound by `withComponentInputBinding`. */
  public readonly id = input.required({ transform: (id: string): CharacterId => CharacterId.parse(id) });

  protected readonly sheet = inject(SheetState);
  protected readonly character = this.sheet.character;
  protected readonly tabs = SHEET_TABS;
  protected readonly title = computed(() => this.character()?.name);

  public constructor() {
    effect(() => {
      this.sheet.store.select(this.id());
    });
  }
}
