import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import type { VariantRuleOption } from '@pioneer/character/domain';
import { AsyncButton, Badge, ListItem, Stack, Text } from '@pioneer/frontier';
import { ApiError } from '@pioneer/shared/web';

import { CharacterVariantStore } from '../../data/character-variant-store';

/**
 * One variant rule of the packs the open character uses: its name and the pack that defines it, whether it is on, and
 * for the owner a button to turn it on or off. Both act on the first press, as the owner can undo either.
 */
@Component({
  selector: 'pio-sheet-variant-rule-row',
  imports: [AsyncButton, Badge, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-variant-rule-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetVariantRuleRow {
  public readonly rule = input.required<VariantRuleOption>();
  /** Whether the variant rule is in force. */
  public readonly on = input.required<boolean>();
  /** Whether the viewer may turn it on or off: the owner, while no campaign decides. */
  public readonly manageable = input.required<boolean>();

  readonly #store = inject(CharacterVariantStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly enable = async (): Promise<void> => this.#store.enable(this.rule().variantId);
  protected readonly disable = async (): Promise<void> => this.#store.disable(this.rule().variantId);

  /** A variant rule the character cannot change says why; anything else is a retry. */
  protected readonly describeError = (error: unknown): string => {
    if (ApiError.isConflict(error)) {
      const { key, params } = ApiError.describe(error);
      return this.#i18n.translate(key, params);
    }
    return this.#i18n.translate('character.variantRules.changeFailed');
  };
}
