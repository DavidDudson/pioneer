import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, BadgeVariant, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import { DegreeOfSuccess } from '@pioneer/rules/sdk';

import { localised } from '../localise';
import type { DegreeAdjustmentView, DegreeView } from '../roll-view';

/** How each degree is tinted: the status tones, solid at the ends so a critical stands out from a plain result. */
interface DegreeTint {
  readonly tone: BadgeTone;
  readonly variant: BadgeVariant;
}

const DEGREE_TINTS: Readonly<Record<DegreeOfSuccess, DegreeTint>> = {
  [DegreeOfSuccess.CriticalSuccess]: { tone: BadgeTone.Success, variant: BadgeVariant.Solid },
  [DegreeOfSuccess.Success]: { tone: BadgeTone.Success, variant: BadgeVariant.Subtle },
  [DegreeOfSuccess.Failure]: { tone: BadgeTone.Warning, variant: BadgeVariant.Subtle },
  [DegreeOfSuccess.CriticalFailure]: { tone: BadgeTone.Danger, variant: BadgeVariant.Solid },
};

interface DegreeDisplay {
  readonly degreeKey: string;
  readonly tint: DegreeTint;
  readonly adjustment: DegreeAdjustmentView | undefined;
  readonly steps: DegreeView['steps'];
}

/**
 * A roll's degree of success tinted by how well it went, then the move an effect made to it ("success to critical
 * success, from Juggernaut") and each step that led to it (comparison, natural die, adjustments) and why.
 */
@Component({
  selector: 'pio-roll-degree',
  imports: [Badge, Stack, Text, TranslocoPipe],
  templateUrl: './roll-degree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RollDegree {
  readonly #format = inject(LocaleFormat);
  public readonly degree = input.required<DegreeView>();

  /** Step reasons carry raw totals and DCs; format them in the viewer's locale like the rest of the card. */
  protected readonly display = computed((): DegreeDisplay => {
    const degree = this.degree();
    return {
      degreeKey: degree.degreeKey,
      tint: DEGREE_TINTS[degree.degree],
      adjustment:
        degree.adjustment === undefined
          ? undefined
          : { ...degree.adjustment, reason: localised(this.#format, degree.adjustment.reason) },
      steps: degree.steps.map((step) => ({
        degreeKey: step.degreeKey,
        reason: localised(this.#format, step.reason),
      })),
    };
  });
}
