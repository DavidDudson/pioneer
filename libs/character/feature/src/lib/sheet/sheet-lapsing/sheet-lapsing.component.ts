import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { ActiveSpell } from '@pioneer/character/domain';
import { AsyncButton, Button, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { ContentKind } from '@pioneer/rules/sdk';

import { injectContentRegistry } from '../../data/content-registry-query';
import { activeRows } from '../sheet-active-list';
import { describeSaveError } from '../sheet-field';

/**
 * The check before End turn (#357): the sustained spells that were not sustained this turn, which End turn would end.
 * Ending the turn goes ahead on confirm; keeping going leaves the turn as it is, so no spell lapses unnoticed.
 */
@Component({
  selector: 'pio-sheet-lapsing',
  imports: [AsyncButton, Button, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-lapsing.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLapsing {
  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #registry = injectContentRegistry([ContentKind.Spell]);

  /** The spells End turn would end. */
  public readonly spells = input.required<readonly ActiveSpell[]>();
  /** Ends the turn; the button waits for it. */
  public readonly confirm = input.required<() => Promise<void>>();
  /** Leaves the turn as it is. */
  public readonly cancelled = output();

  /** The spells' names, as a list in the UI locale. */
  protected readonly names = computed((): string => {
    const registry = this.#registry.data();
    const rows = registry === undefined ? [] : activeRows(registry, { activeSpells: this.spells(), effects: [] });
    return this.#format.list(
      rows.map(({ name }) => name),
      'unit',
    );
  });

  /** The server's reason (a conflict), else the sheet's own wording. */
  protected readonly describeError = (error: unknown): string => {
    const { key, params } = describeSaveError(error);
    return this.#i18n.translate(key, params);
  };
}
