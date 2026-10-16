import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link } from '@pioneer/frontier';
import { BUG_REPORT_PATH, BugReportParam } from '@pioneer/shared/kernel';

import { CharacterStore } from '../../data/character-store';

/** The query the report form reads: the character, and its name for the reporter to see. */
interface ReportQuery {
  readonly [BugReportParam.Character]: string;
  readonly [BugReportParam.CharacterName]: string;
}

/**
 * Report a bug from the sheet: opens the report form with this character attached, named so the
 * reporter sees what goes with the report. Nothing to link to until the character has loaded.
 */
@Component({
  selector: 'pio-sheet-report-bug',
  imports: [Link, TranslocoPipe],
  templateUrl: './sheet-report-bug.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetReportBug {
  readonly #store = inject(CharacterStore);

  protected readonly path = BUG_REPORT_PATH;
  protected readonly query = computed((): ReportQuery | undefined => {
    const character = this.#store.selected();
    return character === undefined
      ? undefined
      : { [BugReportParam.Character]: character.id, [BugReportParam.CharacterName]: character.name };
  });
}
