import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { activeOverrides, OverrideMode } from '@pioneer/character/domain';
import type { Override, OverrideRevision } from '@pioneer/character/domain';
import { EmptyState, List, ListItem, LocaleFormat } from '@pioneer/frontier';
import type { Selector } from '@pioneer/rules/sdk';
import { ModifierType } from '@pioneer/rules/sdk';
import { MODIFIER_TYPE_MESSAGES } from '@pioneer/rules/ui';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';
import { namedStatistics } from '../sheet-statistics';
import { SheetOverrideRow } from './sheet-override-row.component';
import { overrideRows } from './sheet-override-rows';
import type { OverrideRow } from './sheet-override-rows';

/** Message keys the list renders with, spelled out so the key check sees them. */
const Message = {
  EffectAdjust: 'character.sheet.overrides.effectAdjust',
  EffectSet: 'character.sheet.overrides.effectSet',
  Empty: 'character.sheet.overrides.empty',
  EmptyHint: 'character.sheet.overrides.emptyHint',
} as const;

/**
 * Every override in force on the open character: the statistic, what it does, why, and who set it, with the earlier
 * states of an edited one. Without any, it says what an override is and where to make one.
 */
@Component({
  selector: 'pio-sheet-overrides',
  imports: [EmptyState, List, ListItem, SheetOverrideRow, TranslocoPipe],
  templateUrl: './sheet-overrides.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetOverridesSection {
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);

  protected readonly Message = Message;
  protected readonly rows = computed((): readonly OverrideRow[] => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    if (character === undefined) {
      return [];
    }
    const selectors = [...new Set(activeOverrides(character.document).map(({ target }) => target))];
    const statistics =
      registry === undefined ? new Map<Selector, NamedStatistic>() : namedStatistics(registry, character, selectors);
    return overrideRows(character, {
      authors: this.#sheet.originNames().users ?? new Map(),
      statisticName: ({ target }) => {
        const found = statistics.get(target);
        if (found === undefined) {
          return target;
        }
        return found.nameKey === undefined ? found.name : this.#i18n.translate(found.nameKey);
      },
      effect: (override, state) => this.#effect(override, state),
    });
  });

  /** "+2 item" for an adjust, "Pinned to 22" for a set. */
  #effect({ mode }: Override, { value, type }: Pick<OverrideRevision, 'value' | 'type'>): string {
    if (mode === OverrideMode.Set) {
      return this.#i18n.translate(Message.EffectSet, { value: this.#format.number(value) });
    }
    const label: string = this.#i18n.translate(MODIFIER_TYPE_MESSAGES[type ?? ModifierType.Untyped]);
    return this.#i18n.translate(Message.EffectAdjust, {
      value: this.#format.number(value, { signDisplay: 'exceptZero' }),
      type: label,
    });
  }
}
