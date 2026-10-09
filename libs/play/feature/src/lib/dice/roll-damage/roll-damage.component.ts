import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LocaleFormat, Stack, Text } from '@pioneer/frontier';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { localised } from '../localise';
import type { DamageInstanceView, DamageView } from '../roll-view';

interface InstanceDisplay {
  readonly typeKey: string;
  readonly dealt: string;
  readonly taken: string;
  readonly lines: readonly MessageDescriptor[];
}

/** Immediate or persistent damage: a heading with what the target takes, then each instance. */
interface SectionDisplay {
  readonly headingKey: string;
  readonly taken: string;
  readonly instances: readonly InstanceDisplay[];
}

/**
 * Damage a roll did to the target: what it takes now and, apart, persistent damage each turn, with
 * every instance's dealt and taken amounts and the lines that explain the difference.
 */
@Component({
  selector: 'pio-roll-damage',
  imports: [Stack, Text, TranslocoPipe],
  templateUrl: './roll-damage.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollDamage {
  readonly #format = inject(LocaleFormat);
  public readonly damage = input.required<DamageView>();

  protected readonly sections = computed((): readonly SectionDisplay[] => {
    const damage = this.damage();
    const immediate: SectionDisplay = {
      headingKey: 'play.dice.damageTaken',
      taken: this.#format.number(damage.taken),
      instances: damage.immediate.map((instance) => this.#instance(instance)),
    };
    const persistent: SectionDisplay = {
      headingKey: 'play.dice.persistentTaken',
      taken: this.#format.number(damage.persistentTaken),
      instances: damage.persistent.map((instance) => this.#instance(instance)),
    };
    return damage.persistent.length === 0 ? [immediate] : [immediate, persistent];
  });

  #instance(instance: DamageInstanceView): InstanceDisplay {
    return {
      typeKey: instance.typeKey,
      dealt: this.#format.number(instance.dealt),
      taken: this.#format.number(instance.taken),
      lines: instance.lines.map((line) => localised(this.#format, line)),
    };
  }
}
