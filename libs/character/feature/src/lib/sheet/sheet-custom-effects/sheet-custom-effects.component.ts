import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { OverrideMode } from '@pioneer/character/domain';
import type { CustomEffectLine } from '@pioneer/character/domain';
import { EmptyState, List, ListItem, LocaleFormat, Stack } from '@pioneer/frontier';
import type { Selector } from '@pioneer/rules/sdk';
import { ModifierType } from '@pioneer/rules/sdk';
import { MODIFIER_TYPE_MESSAGES } from '@pioneer/rules/ui';
import type { NamedStatistic } from '@pioneer/rules/ui';

import { SheetState } from '../sheet-state';
import { namedStatistics } from '../sheet-statistics';
import { SheetCustomEffectForm } from './sheet-custom-effect-form.component';
import { SheetCustomEffectRow } from './sheet-custom-effect-row.component';
import { customEffectRows } from './sheet-custom-effect-rows';
import type { CustomEffectRow } from './sheet-custom-effect-rows';

/** Message keys the list renders with, spelled out so the key check sees them. */
const Message = {
  EffectAdjust: 'character.sheet.overrides.effectAdjust',
  EffectSet: 'character.sheet.overrides.effectSet',
  Empty: 'character.sheet.customEffects.empty',
  EmptyHint: 'character.sheet.customEffects.emptyHint',
} as const;

/**
 * Every custom effect in force on the open character, on or off: its name, reason, lines and who added it, with a
 * switch that turns every line on or off together, and the form that adds one. Without any, it says what an effect is.
 */
@Component({
  selector: 'pio-sheet-custom-effects',
  imports: [EmptyState, List, ListItem, SheetCustomEffectForm, SheetCustomEffectRow, Stack, TranslocoPipe],
  templateUrl: './sheet-custom-effects.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetCustomEffectsSection {
  readonly #sheet = inject(SheetState);
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);

  protected readonly Message = Message;
  protected readonly rows = computed((): readonly CustomEffectRow[] => {
    const registry = this.#sheet.engine();
    const character = this.#sheet.character();
    if (character === undefined) {
      return [];
    }
    const selectors = character.document.customEffects.flatMap(({ lines }) => lines.map(({ target }) => target));
    const statistics =
      registry === undefined
        ? new Map<Selector, NamedStatistic>()
        : namedStatistics(registry, character, [...new Set(selectors)]);
    return customEffectRows(character, {
      authors: this.#sheet.originNames().users ?? new Map(),
      line: (line) => ({ statistic: this.#statisticName(statistics, line), effect: this.#effect(line) }),
    });
  });

  #statisticName(statistics: ReadonlyMap<Selector, NamedStatistic>, { target }: CustomEffectLine): string {
    const found = statistics.get(target);
    if (found === undefined) {
      return target;
    }
    return found.nameKey === undefined ? found.name : this.#i18n.translate(found.nameKey);
  }

  /** "+1 status", or "Pinned to 20" for a line that sets. */
  #effect({ value, type, mode }: CustomEffectLine): string {
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
