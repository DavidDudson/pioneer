import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, HeadingLevel, Stack, Text } from '@pioneer/frontier';

import { ACTION_COST_MESSAGES } from '../rich-text/rich-text-messages';
import { RichTextView } from '../rich-text/rich-text.component';
import type { AbilityLine } from './creature-stat-block';
import { StatLinesView } from './stat-lines.component';

/** The special abilities of a stat block: passive traits, actions and reactions, each with its rules text. */
@Component({
  selector: 'pio-stat-abilities',
  imports: [Badge, RichTextView, StatLinesView, Stack, Text, TranslocoPipe],
  templateUrl: './stat-abilities.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatAbilitiesView {
  public readonly abilities = input.required<readonly AbilityLine[]>();
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly actionCosts = ACTION_COST_MESSAGES;
}
