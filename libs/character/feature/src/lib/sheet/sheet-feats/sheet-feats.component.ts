import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import {
  AsyncData,
  AsyncPending,
  AsyncRegion,
  EmptyState,
  Grid,
  InlineField,
  Skeleton,
  Stack,
} from '@pioneer/frontier';
import { Combobox } from '@pioneer/frontier/data';
import { filter, merge } from 'rxjs';

import { CharacterStore } from '../../data/character-store';
import { injectContentRegistry } from '../../data/content-registry-query';
import { SheetFeatGroupList } from '../sheet-feat-group/sheet-feat-group.component';
import { featFieldsOf } from '../sheet-feat-picks';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';

const LOADING_SLOTS = 3;

/**
 * The open character's feats (#466, #487): the feats it has by slot type, each with the level it was taken at, its
 * display category and a note, then a pick per feat slot
 * up to its level, lowest first. Each picker lists the feats its slot offers at its level; one whose prerequisites the
 * character doesn't meet there is shown but can't be picked, saying what they are, and one whose prerequisites can't be
 * checked says so. A pick whose prerequisites stop holding says why under its slot.
 */
@Component({
  selector: 'pio-sheet-feats',
  imports: [
    AsyncData,
    AsyncPending,
    AsyncRegion,
    Combobox,
    EmptyState,
    Grid,
    InlineField,
    SheetFeatGroupList,
    Skeleton,
    Stack,
    TranslocoPipe,
  ],
  templateUrl: './sheet-feats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetFeats {
  /** Placeholder pickers while the feats load: a 1st-level character's. */
  protected readonly loadingSlots = Array.from({ length: LOADING_SLOTS }, (_unused, index) => index);

  readonly #store = inject(CharacterStore);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the pickers' descriptions are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

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
  });
}
