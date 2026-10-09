import { ChangeDetectionStrategy, Component, computed, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack, Surface, Text } from '@pioneer/frontier';
import type { DamageTarget } from '@pioneer/rules/dice';
import { DamageTypeSchema, Immunity } from '@pioneer/rules/sdk';
import type { DamageAdjustment, DamageType } from '@pioneer/rules/sdk';

import { AdjustmentEditor, AdjustmentKind } from '../adjustment-editor/adjustment-editor.component';
import { ImmunityEditor } from '../immunity-editor/immunity-editor.component';

/** The target a damage roll is applied to: its immunities, weaknesses and resistances. */
@Component({
  selector: 'pio-damage-target-editor',
  imports: [AdjustmentEditor, Heading, ImmunityEditor, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './damage-target-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DamageTargetEditor {
  public readonly target = model.required<DamageTarget>();
  protected readonly weakness = AdjustmentKind.Weakness;
  protected readonly resistance = AdjustmentKind.Resistance;

  /** Immunities that are damage types; the editor only adds those. */
  protected readonly immunities = computed((): readonly DamageType[] =>
    this.target().immunities.flatMap((immunity) => {
      const type = DamageTypeSchema.safeParse(immunity);
      return type.success ? [type.data] : [];
    }),
  );

  protected setImmunities(types: readonly DamageType[]): void {
    this.target.update((target) => ({ ...target, immunities: types.map((type) => Immunity.parse(type)) }));
  }

  protected setWeaknesses(weaknesses: readonly DamageAdjustment[]): void {
    this.target.update((target) => ({ ...target, weaknesses }));
  }

  protected setResistances(resistances: readonly DamageAdjustment[]): void {
    this.target.update((target) => ({ ...target, resistances }));
  }
}
