import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Text } from '@pioneer/frontier';

/** How many of an import's feats, heritage and languages fit no slot: kept on the character as flagged rule breaks, never forced into a slot. */
@Component({
  selector: 'pio-import-feat-report',
  imports: [Text, TranslocoPipe],
  templateUrl: './import-feat-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportFeatReport {
  public readonly count = input.required<number>();
  /** How many of its heritage and languages fit no slot. */
  public readonly picks = input.required<number>();
}
