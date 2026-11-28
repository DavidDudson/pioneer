import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Heading, HeadingLevel, Stack, Text } from '@pioneer/frontier';

import { TraitChip } from '../trait-chip/trait-chip.component';
import { FamiliarCardStatus } from './familiar-card';
import type { FamiliarCardView } from './familiar-card';
import { FamiliarStats } from './familiar-stats.component';

/** Message keys the card renders with, spelled out so the key check sees them. */
const FamiliarMessage = {
  Absorbed: 'rules.familiar.absorbedNote',
} as const;

/** The word for each status. */
const STATUS_MESSAGES = {
  [FamiliarCardStatus.Active]: 'rules.familiar.status.active',
  [FamiliarCardStatus.Absent]: 'rules.familiar.status.absent',
  [FamiliarCardStatus.Absorbed]: 'rules.familiar.status.absorbed',
  [FamiliarCardStatus.Dead]: 'rules.familiar.status.dead',
} as const satisfies Record<FamiliarCardStatus, string>;

const STATUS_TONES = {
  [FamiliarCardStatus.Active]: BadgeTone.Success,
  [FamiliarCardStatus.Absent]: BadgeTone.Neutral,
  [FamiliarCardStatus.Absorbed]: BadgeTone.Info,
  [FamiliarCardStatus.Dead]: BadgeTone.Danger,
} as const satisfies Record<FamiliarCardStatus, BadgeTone>;

/**
 * A familiar's stat block: its name and species, its status in words, Hit Points, AC, saves, Perception, skills,
 * Speeds, senses and traits. An absorbed familiar shows its name and status only, since it cannot be hurt as a
 * creature. Reads in that order for a screen reader, and says its status in words, never by colour alone.
 *
 * Presentational (ADR-0028): the sheet derives the numbers from the master and passes them in.
 *
 * ```html
 * <pio-familiar-card [familiar]="familiar()" />
 * ```
 */
@Component({
  selector: 'pio-familiar-card',
  imports: [Badge, FamiliarStats, Heading, Stack, Text, TraitChip, TranslocoPipe],
  templateUrl: './familiar-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FamiliarCard {
  public readonly familiar = input.required<FamiliarCardView>();
  /** The level of the familiar's name. */
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly Message = FamiliarMessage;
  protected readonly statusMessages = STATUS_MESSAGES;
  protected readonly statusTones = STATUS_TONES;

  /** Whether the card shows the creature's numbers: all but an absorbed familiar's. */
  protected readonly showsNumbers = computed((): boolean => this.familiar().status !== FamiliarCardStatus.Absorbed);
}
