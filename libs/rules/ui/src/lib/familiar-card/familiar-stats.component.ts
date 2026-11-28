import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { DescriptionItem, DescriptionList, Distance, LocaleFormat, Meter, Stack, Text } from '@pioneer/frontier';

import { FamiliarCardMovement, FamiliarCardSense } from './familiar-card';
import type { FamiliarCardView } from './familiar-card';

/** Message keys the numbers render with, spelled out so the key check sees them. */
const FamiliarStatsMessage = {
  HitPoints: 'rules.familiar.hitPoints',
  Temp: 'rules.familiar.temp',
  ArmorClass: 'rules.familiar.armorClass',
  Fortitude: 'rules.familiar.fortitude',
  Reflex: 'rules.familiar.reflex',
  Will: 'rules.familiar.will',
  Perception: 'rules.familiar.perception',
  Senses: 'rules.familiar.senses',
} as const;

/** The word for each way of moving. */
const MOVEMENT_MESSAGES = {
  [FamiliarCardMovement.Land]: 'rules.familiar.movement.land',
  [FamiliarCardMovement.Burrow]: 'rules.familiar.movement.burrow',
  [FamiliarCardMovement.Climb]: 'rules.familiar.movement.climb',
  [FamiliarCardMovement.Fly]: 'rules.familiar.movement.fly',
  [FamiliarCardMovement.Swim]: 'rules.familiar.movement.swim',
} as const satisfies Record<FamiliarCardMovement, string>;

/** The word for each sense. */
const SENSE_MESSAGES = {
  [FamiliarCardSense.LowLightVision]: 'rules.familiar.sense.lowLightVision',
  [FamiliarCardSense.Darkvision]: 'rules.familiar.sense.darkvision',
  [FamiliarCardSense.Echolocation]: 'rules.familiar.sense.echolocation',
  [FamiliarCardSense.Scent]: 'rules.familiar.sense.scent',
} as const satisfies Record<FamiliarCardSense, string>;

/** The creature's numbers on a familiar card: Hit Points, defences, skills, Speeds, senses and traits. */
@Component({
  selector: 'pio-familiar-stats',
  imports: [DescriptionItem, DescriptionList, Distance, Meter, Stack, Text, TranslocoPipe],
  templateUrl: './familiar-stats.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliarStats {
  public readonly familiar = input.required<FamiliarCardView>();

  readonly #format = inject(LocaleFormat);

  protected readonly Message = FamiliarStatsMessage;
  protected readonly movementMessages = MOVEMENT_MESSAGES;
  protected readonly senseMessages = SENSE_MESSAGES;

  /** A modifier with its sign, in the active locale: +9, −1. */
  protected readonly signed = (value: number): string => this.#format.number(value, { signDisplay: 'always' });
}
