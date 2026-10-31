import { ChangeDetectionStrategy, Component, computed, inject, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoService } from '@jsverse/transloco';
import { Stack } from '@pioneer/frontier';
import type { SlotKey } from '@pioneer/rules/sdk';
import { LevelTimeline, TimelinePickKind } from '@pioneer/rules/ui';
import type { AttributePickerRow, LevelTimelineRow, SkillPickerRow, TimelinePick } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { injectContentRegistry } from '../../data/content-registry-query';
import { SheetArchetypeProgress } from '../sheet-archetype-progress/sheet-archetype-progress.component';
import { plannedFeatFieldsOf } from '../sheet-feat-picks';
import { FEAT_CONTENT_KINDS } from '../sheet-feats';
import { SheetPickFields } from '../sheet-pick-fields/sheet-pick-fields.component';
import type { SlotPickRows } from '../sheet-slot-picks';
import { SheetState } from '../sheet-state';

/** The skills a planned skill slot offers; none for any other kind of slot. */
function skillRowsOf(read: SlotPickRows): readonly SkillPickerRow[] {
  return read.kind === 'skills' ? read.rows : [];
}

/** The attributes a planned boost slot offers; none for any other kind of slot. */
function attributeRowsOf(read: SlotPickRows): readonly AttributePickerRow[] {
  return read.kind === 'attributes' ? read.rows : [];
}

/**
 * The level timeline with the character's plan (#492): each slot above its level offers a picker, a feat's listing the
 * feats it will offer at the slot's level with the prerequisites met by then, a skill's or a boost's the skills and
 * attributes it will offer. A pick is an ordinary slot pick, so levelling up turns it on. The pickers for the level-1
 * trained skills and skill increases sit above the timeline.
 */
@Component({
  selector: 'pio-sheet-level-plan',
  imports: [LevelTimeline, SheetArchetypeProgress, SheetPickFields, Stack],
  templateUrl: './sheet-level-plan.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLevelPlan {
  readonly #state = inject(SheetState);
  protected readonly picks = this.#state.picks;
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
    for (const { key, label, rows, field } of this.#state.picks.plannedFields()) {
      // A slot's kind never changes while its key stands, so reading it untracked keeps the pick from being rebuilt.
      const { kind } = untracked(rows);
      if (kind === 'skills') {
        picks.set(key, {
          kind: TimelinePickKind.Skill,
          key,
          label,
          rows: computed(() => skillRowsOf(rows())),
          field,
        });
      } else if (kind === 'attributes') {
        picks.set(key, {
          kind: TimelinePickKind.Boost,
          key,
          label,
          rows: computed(() => attributeRowsOf(rows())),
          field,
        });
      }
    }
    for (const { key, label, rows, reason, field } of this.#featFields()) {
      picks.set(key, { kind: TimelinePickKind.Feat, key, label, rows, reason, field });
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
