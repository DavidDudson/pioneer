import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Button, DescriptionItem, DescriptionList, Skeleton, Stack, Text, Tone } from '@pioneer/frontier';

import { ATTRIBUTE_MESSAGES } from '../attributes/attributes-messages';
import { BuildPart } from './build-line';
import type { BuildLine, BuildValue } from './build-line';
import {
  BUILD_EMPTY_MESSAGES,
  BUILD_PART_MESSAGES,
  BuildSummaryMessage,
  SIZE_MESSAGES,
} from './build-summary-messages';

/** A part as shown: its label, and either a name to show as it is or a message key, muted when empty. */
interface ShownPart {
  readonly part: BuildPart;
  readonly labelKey: string;
  readonly name: string | undefined;
  readonly valueKey: string | undefined;
  /** Muted for an empty part, so what to pick reads apart from what is picked. */
  readonly tone: Tone;
}

/** A value's message key: an attribute's or a size's name; none for content, which shows its own name. */
function valueKey(value: BuildValue): string | undefined {
  if ('attribute' in value) {
    return ATTRIBUTE_MESSAGES[value.attribute];
  }
  return 'size' in value ? SIZE_MESSAGES[value.size] : undefined;
}

function shown({ part, value }: BuildLine): ShownPart {
  const labelKey = BUILD_PART_MESSAGES[part];
  if (value === undefined) {
    return { part, labelKey, name: undefined, valueKey: BUILD_EMPTY_MESSAGES[part], tone: Tone.Muted };
  }
  return {
    part,
    labelKey,
    name: 'name' in value ? value.name : undefined,
    valueKey: valueKey(value),
    tone: Tone.Default,
  };
}

/**
 * What the character is at a glance: class, subclass, ancestry, heritage, background, deity, key attribute and size.
 * An empty part says what to pick, and Edit build goes to where they are picked.
 *
 * Read-only and presentational (ADR-0028): the caller names each part, or passes undefined while the character loads.
 *
 * ```html
 * <pio-build-summary [lines]="buildLines()" (edit)="editBuild()" />
 * ```
 */
@Component({
  selector: 'pio-build-summary',
  imports: [Button, DescriptionItem, DescriptionList, Skeleton, Stack, Text, TranslocoPipe],
  templateUrl: './build-summary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuildSummaryView {
  /** The parts in summary order, or undefined while they load. */
  public readonly lines = input<readonly BuildLine[] | undefined>();
  /** The player asked to change the build. */
  public readonly edit = output();

  protected readonly Message = BuildSummaryMessage;
  /** Every part's label, each with a placeholder while the build loads. */
  protected readonly loadingTerms = Object.values(BuildPart).map((part) => BUILD_PART_MESSAGES[part]);
  protected readonly parts = computed((): readonly ShownPart[] | undefined => this.lines()?.map((line) => shown(line)));
}
