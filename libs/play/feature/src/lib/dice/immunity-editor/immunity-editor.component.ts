import { ChangeDetectionStrategy, Component, computed, inject, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, EmptyState, Field, Heading, Label, Stack, Text } from '@pioneer/frontier';
import { Picker } from '@pioneer/frontier/data';
import type { PickerSort } from '@pioneer/frontier/data';
import { DAMAGE_TYPE_KEYS } from '@pioneer/play/ui';
import type { DamageType } from '@pioneer/rules/sdk';

import { DamageTargetOptions } from '../damage-target-options';
import { shownTargets, targetLabel, targetValue } from '../damage-target-table';

/** A target's immunities: each damage type it ignores, with a picker to add one and a button to remove each. */
@Component({
  selector: 'pio-immunity-editor',
  imports: [Button, EmptyState, Field, Heading, Label, Picker, Stack, Text, TranslocoPipe],
  templateUrl: './immunity-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmunityEditor {
  protected readonly options = inject(DamageTargetOptions);
  protected readonly labels = DAMAGE_TYPE_KEYS;
  public readonly immunities = model.required<readonly DamageType[]>();
  protected readonly choice = signal<DamageType | undefined>(undefined);
  protected readonly query = signal('');
  protected readonly sorting = signal<PickerSort | undefined>(undefined);
  protected readonly shown = computed(() => shownTargets(this.options.types(), this.query(), this.sorting()));
  protected readonly rowValue = targetValue;
  protected readonly rowLabel = targetLabel;

  protected add(): void {
    const choice = this.choice();
    if (choice === undefined) {
      return;
    }
    this.immunities.update((types) => (types.includes(choice) ? types : [...types, choice]));
    this.choice.set(undefined);
  }

  protected remove(type: DamageType): void {
    this.immunities.update((types) => types.filter((entry) => entry !== type));
  }
}
