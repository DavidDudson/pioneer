import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { RuleLimitSettingValue } from '@pioneer/character/domain';
import type { CharacterRuleLimitSetting, RuleLimitField } from '@pioneer/character/domain';
import { AsyncButton, Badge, InlineEdit, InlineField, ListItem, NumberInput, Stack, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';
import { ApiError } from '@pioneer/shared/web';

import { CharacterRuleLimitSettingStore } from '../../data/character-rule-limit-setting-store';

/** Each limit's label. */
const LIMIT_LABELS: Readonly<Record<RuleLimitField, string>> = {
  investedMax: 'character.ruleLimits.investedMax',
  handsMax: 'character.ruleLimits.handsMax',
  propertyRunesPerGrade: 'character.ruleLimits.propertyRunesPerGrade',
  itemsMax: 'character.ruleLimits.itemsMax',
};

/** Draft placeholder while the limits load; never shown, as editing waits for them. */
const NO_LIMIT = RuleLimitSettingValue.parse(1);

/**
 * One table limit of the open character: its name, the number in force and, for its owner outside a campaign, an inline
 * edit for the number and a button that returns it to the core rules' number. A number past the limit's ceiling is
 * refused by the server and shown under the field.
 */
@Component({
  selector: 'pio-sheet-rule-limit-row',
  imports: [AsyncButton, Badge, InlineField, ListItem, NumberInput, Stack, Text, TranslocoPipe],
  templateUrl: './sheet-rule-limit-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetRuleLimitRow {
  public readonly setting = input.required<CharacterRuleLimitSetting>();
  /** Whether the viewer may change the limit: the owner, while no campaign decides. */
  public readonly manageable = input.required<boolean>();

  readonly #store = inject(CharacterRuleLimitSettingStore);
  readonly #i18n = inject(TranslocoService);

  protected readonly label = computed((): string => LIMIT_LABELS[this.setting().limit]);

  protected readonly edit = new InlineEdit<number>({
    source: computed((): number => this.setting().value),
    empty: NO_LIMIT,
    schema: RuleLimitSettingValue,
    save: async (value: number): Promise<void> =>
      this.#store.set(this.setting().limit, RuleLimitSettingValue.parse(value)),
    isConflict: (error: unknown): boolean => ApiError.isConflict(error),
    describeError: (error: unknown): MessageDescriptor => ApiError.describe(error),
  });

  protected readonly reset = async (): Promise<void> => this.#store.reset(this.setting().limit);

  protected readonly describeError = (): string => this.#i18n.translate('character.ruleLimits.changeFailed');
}
