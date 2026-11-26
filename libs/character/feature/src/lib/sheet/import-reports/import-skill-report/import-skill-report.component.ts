import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, List, ListItem, Stack, Text } from '@pioneer/frontier';
import type { SkillGap } from '@pioneer/interop/pathbuilder';
import { Proficiency } from '@pioneer/rules/sdk';
import { PROFICIENCY_NAMES } from '@pioneer/rules/ui';

/** A skill or Lore ranked higher in the export than the skill slots reach, as the list shows it. */
interface GapView {
  readonly name: string;
  readonly wantedKey: string;
  readonly reachedKey: string;
}

/** Where a Pathbuilder import's skill and Lore ranks fell short: each skill the build's slots can't raise as far. */
@Component({
  selector: 'pio-import-skill-report',
  imports: [Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-skill-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSkillReport {
  public readonly skillGaps = input.required<readonly SkillGap[]>();

  protected readonly anyGaps = computed(() => this.skillGaps().length > 0);

  protected readonly gaps = computed((): readonly GapView[] =>
    this.skillGaps().map(({ name, wanted, reached }) => ({
      name,
      wantedKey: PROFICIENCY_NAMES[wanted],
      reachedKey: PROFICIENCY_NAMES[reached ?? Proficiency.Untrained],
    })),
  );
}
