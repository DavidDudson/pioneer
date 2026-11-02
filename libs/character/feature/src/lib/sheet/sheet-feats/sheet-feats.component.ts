import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { FeatDisplaySection } from '@pioneer/character/domain';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Grid,
  InlineField,
  Skeleton,
  Stack,
  ToggleButton,
} from '@pioneer/frontier';
import { ENTRY_PREVIEWS, FeatPicker } from '@pioneer/rules/ui';
import type { EntryPreviews } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { FeatDisplayStore } from '../../data/feat-display-store';
import { SheetFeatGroupList } from '../sheet-feat-group/sheet-feat-group.component';
import { featFieldsOf } from '../sheet-feat-picks';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { injectFilterSources } from '../sheet-filter-sources';
import { sheetSectionPreviews } from '../sheet-section-previews';
import {
  FEAT_FILTER_MESSAGES,
  SheetSlotFilterPanel,
} from '../sheet-slot-filter-panel/sheet-slot-filter-panel.component';
import { SheetUnplacedFeats } from '../sheet-unplaced-feats/sheet-unplaced-feats.component';

const LOADING_SLOTS = 3;

/**
 * The open character's feats (#466, #487): the feats it has by slot type, each with the level it was taken at, its
 * display category and a note, then a pick per feat slot
 * up to its level, lowest first. Each picker lists the feats its slot offers at its level; one whose prerequisites the
 * character doesn't meet there is shown but can't be picked, saying what they are, and one whose prerequisites can't be
 * checked says so. A pick whose prerequisites stop holding says why under its slot. An open picker starts on **Available
 * to you** for its slot, with the facet filters and a toggle that shows every feat; the player's filters are in the URL
 * under the slot (`f.<slot>.<facet>`).
 */
@Component({
  selector: 'pio-sheet-feats',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    EmptyState,
    FeatPicker,
    Grid,
    InlineField,
    SheetSlotFilterPanel,
    SheetFeatGroupList,
    SheetUnplacedFeats,
    Skeleton,
    Stack,
    ToggleButton,
    TranslocoPipe,
  ],
  templateUrl: './sheet-feats.component.html',
  providers: [{ provide: ENTRY_PREVIEWS, useFactory: (): EntryPreviews => inject(SheetFeats).previews }],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFeats {
  /** Placeholder pickers while the feats load: a 1st-level character's. */
  protected readonly filterMessages = FEAT_FILTER_MESSAGES;
  protected readonly loadingSlots = Array.from({ length: LOADING_SLOTS }, (_unused, index) => index);

  readonly #store = inject(CharacterStore);
  readonly #display = inject(FeatDisplayStore);
  readonly #filters = injectFilterSources();
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the pickers' descriptions are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** Whether the user shows this section's grant-only feats. */
  protected readonly shownGrantOnly = computed(() => this.#display.shownIn().includes(FeatDisplaySection.Feats));

  /** The registry with the feats. */
  protected readonly feats = injectContentRegistry(FEAT_CONTENT_KINDS);
  /** One pick per feat slot up to the character's level, and the feats its features grant. */
  protected readonly fields = featFieldsOf({
    registry: this.feats.data,
    character: this.#store.selected,
    slots: this.#store.slots,
    select: async (slot, selection) => this.#store.selectSlot(slot, selection),
    clear: async (slot) => this.#store.clearSlot(slot),
    translate: (key, params) => this.#i18n.translate(key, params),
    messages: this.#messages,
    showGrantOnly: this.shownGrantOnly,
    filters: this.#filters,
  });

  /** What a feat row previews on hover, read from the loaded registry. */
  public readonly previews: EntryPreviews = sheetSectionPreviews(() => this.feats.data());

  protected showGrantOnly(shown: boolean): void {
    this.#display.show(FeatDisplaySection.Feats, shown);
  }
}
