import { ChangeDetectionStrategy, Component, inject, model, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, Field, Heading, Label, Select, Stack, Text } from '@pioneer/frontier';
import type { DamageType } from '@pioneer/rules/sdk';

import { DamageTargetOptions } from '../damage-target-options';
import { DAMAGE_TYPE_KEYS } from '../dice-labels';

/** A target's immunities: each damage type it ignores, with a picker to add one and a button to remove each. */
@Component({
  selector: 'pio-immunity-editor',
  imports: [Button, Field, Heading, Label, Select, Stack, Text, TranslocoPipe],
  templateUrl: './immunity-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImmunityEditor {
  protected readonly options = inject(DamageTargetOptions);
  protected readonly labels = DAMAGE_TYPE_KEYS;
  public readonly immunities = model.required<readonly DamageType[]>();
  protected readonly choice = signal<DamageType | undefined>(undefined);

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
