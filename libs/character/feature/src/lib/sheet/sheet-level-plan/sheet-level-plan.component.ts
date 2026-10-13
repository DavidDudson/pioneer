import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import type { SlotKey } from '@pioneer/rules/sdk';
import { LevelTimeline, TimelinePickKind } from '@pioneer/rules/ui';
import type { LevelTimelineRow, TimelinePick } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { injectContentRegistry } from '../../data/content-registry-query';
import { plannedFeatFieldsOf } from '../sheet-feat-picks';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { SheetState } from '../sheet-state';

/**
 * The level timeline with the character's plan (#492): each slot above its level offers a picker, a feat's listing the
 * feats it will offer at the slot's level with the prerequisites met by then, a skill's or a boost's the skills and
 * attributes it will offer. A pick is an ordinary slot pick, so levelling up turns it on.
 */
@Component({
  selector: 'pio-sheet-level-plan',
  imports: [LevelTimeline],
  templateUrl: './sheet-level-plan.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLevelPlan {
  readonly #state = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Changes when the language changes or the messages load, so the pickers' descriptions are read again. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The registry with the feats, shared with the feats section. */
  readonly #feats = injectContentRegistry(FEAT_CONTENT_KINDS);
  readonly #featFields = plannedFeatFieldsOf({
    registry: this.#feats.data,
    character: this.#state.character,
    slots: this.#state.store.slots,
    select: async (slot, selection) => this.#state.store.selectSlot(slot, selection),
    clear: async (slot) => this.#state.store.clearSlot(slot),
    translate: (key, params) => this.#i18n.translate(key, params),
    messages: this.#messages,
    showGrantOnly: computed(() => false),
  });

  /** A picker for each planned slot, by the slot's key. */
  readonly #picks = computed((): ReadonlyMap<SlotKey, TimelinePick> => {
    const picks = new Map<SlotKey, TimelinePick>();
    for (const { key, label, options, field } of this.#state.picks.plannedFields()) {
      picks.set(key, { kind: TimelinePickKind.Select, key, label, options, field });
    }
    for (const { key, label, matches, search, reason, field } of this.#featFields()) {
      picks.set(key, { kind: TimelinePickKind.Combobox, key, label, matches, search, reason, field });
    }
    return picks;
  });

  /** The timeline's rows with a picker on each planned slot that has one; undefined while the character loads. */
  protected readonly rows = computed((): readonly LevelTimelineRow[] | undefined => {
    const picks = this.#picks();
    return this.#state.picks.timeline()?.map(({ level, current, lines }) => ({
      level,
      current,
      lines,
      picks: lines.flatMap((line) => picks.get(line.key) ?? []),
    }));
  });
}
