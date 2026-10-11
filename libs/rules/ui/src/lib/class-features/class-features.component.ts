import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState, List, ListItem, Skeleton, Stack, Text } from '@pioneer/frontier';

import type { ClassFeatureLine } from './class-feature-line';
import { ClassFeaturesMessage } from './class-features-messages';

const LOADING_ROWS = 3;

/**
 * The class features a character has at its level, each with where it came from: "from Cleric, level 1". A subclass's
 * feature reads the class level of the feature that offered it.
 *
 * Read-only and presentational (ADR-0028): the caller works out the lines from the character's grants, in class level
 * then name order, or passes undefined while they load.
 *
 * ```html
 * <pio-class-features [lines]="classFeatures()" />
 * ```
 */
@Component({
  selector: 'pio-class-features',
  imports: [EmptyState, List, ListItem, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './class-features.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassFeaturesView {
  /** The features in sheet order, or undefined while they load. */
  public readonly lines = input<readonly ClassFeatureLine[] | undefined>();

  protected readonly Message = ClassFeaturesMessage;
  protected readonly loadingRows = Array.from({ length: LOADING_ROWS }, (_unused, index) => index);
}
