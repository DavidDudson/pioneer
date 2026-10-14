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
  Skeleton,
  Stack,
  Tab,
  Tabs,
  Text,
} from '@pioneer/frontier';
import { VitalsView } from '@pioneer/rules/ui';

import { CharacterPackStore } from '../../data/character-pack-store';
import { FeatDisplayStore } from '../../data/feat-display-store';
import { PlayStore } from '../../data/play-store';
import { SOURCE_PACKS_PROVIDER } from '../../data/source-packs';
import { SheetConditions } from '../sheet-conditions/sheet-conditions.component';
import { SheetCounted } from '../sheet-counted/sheet-counted.component';
import { SheetDeathTrack } from '../sheet-death-track/sheet-death-track.component';
import { SheetExport } from '../sheet-export/sheet-export.component';
import { SheetHitPoints } from '../sheet-hit-points/sheet-hit-points.component';
import { SheetLastRoll } from '../sheet-last-roll/sheet-last-roll.component';
import { SheetResources } from '../sheet-resources/sheet-resources.component';
import { SHEET_ROLLS_PROVIDERS } from '../sheet-rolls';
import { SheetSaveStatus } from '../sheet-save-status/sheet-save-status.component';
import { SHEET_TABS } from '../sheet-sections';
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
    RouterOutlet,
    SheetDeathTrack,
    SheetConditions,
    SheetExport,
    SheetCounted,
    SheetResources,
    SheetHitPoints,
    SheetLastRoll,
    SheetSaveStatus,
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
    SheetState,
    PlayStore,
    FeatDisplayStore,
    CharacterPackStore,
    SOURCE_PACKS_PROVIDER,
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
