import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ConditionInstanceId, PlayCommandField, UNLIMITED } from '@pioneer/character/domain';
import type { PlayCommand } from '@pioneer/character/domain';
import { AsyncButton, NumberInput, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { ConditionValue, ContentId } from '@pioneer/rules/sdk';
import { OptionPicker } from '@pioneer/rules/ui';
import { newId } from '@pioneer/shared/kernel';

import { CONDITION_VALUE_MAX } from '../sheet-conditions';
import type { ConditionOption } from '../sheet-conditions';

const FIRST_VALUE = 1;

/**
 * The picker that puts a condition on the character (#348): the condition, and the value it starts at when it carries
 * one. The edit itself is the sheet's, handed in as `send`, so every condition edit shares one revision.
 */
@Component({
  selector: 'pio-sheet-condition-add',
  imports: [OptionPicker, AsyncButton, NumberInput, Stack, TranslocoPipe],
  templateUrl: './sheet-condition-add.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetConditionAdd {
  public readonly options = input.required<readonly ConditionOption[]>();
  public readonly busy = input.required<boolean>();
  public readonly send = input.required<(command: PlayCommand) => Promise<void>>();
  public readonly describeError = input.required<(error: unknown) => string>();

  protected readonly valueMax = CONDITION_VALUE_MAX;
  protected readonly valueMin = FIRST_VALUE;

  protected readonly choices = computed((): readonly SelectOption<string>[] =>
    this.options().map(({ id, name }) => ({ value: id, label: name })),
  );

  /** The condition picked to add, and the value it starts at when it has one. */
  protected readonly picked = signal<string | undefined>(undefined);
  protected readonly startValue = signal(FIRST_VALUE);
  protected readonly startComplete = signal(true);
  protected readonly pickedOption = computed((): ConditionOption | undefined =>
    this.options().find(({ id }) => id === this.picked()),
  );
  protected readonly canAdd = computed((): boolean => {
    const option = this.pickedOption();
    return option !== undefined && (!option.valued || this.#startable());
  });

  protected readonly add = async (): Promise<void> => {
    const option = this.pickedOption();
    if (option === undefined) {
      return;
    }
    await this.send()({
      field: PlayCommandField.AddCondition,
      condition: {
        id: ConditionInstanceId.parse(newId()),
        condition: ContentId.parse(option.id),
        ...(option.valued ? { value: ConditionValue.parse(this.startValue()) } : {}),
        duration: UNLIMITED,
      },
    });
    this.picked.set(undefined);
    this.startValue.set(FIRST_VALUE);
  };

  #startable(): boolean {
    const value = this.startValue();
    return this.startComplete() && value >= FIRST_VALUE && value <= CONDITION_VALUE_MAX;
  }
}
