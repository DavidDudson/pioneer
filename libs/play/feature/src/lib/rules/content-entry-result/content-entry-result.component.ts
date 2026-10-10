import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack, Surface } from '@pioneer/frontier';
import type { SourceRef } from '@pioneer/rules/sdk';
import { SourceLineView } from '@pioneer/rules/ui';

import type { CheckOutcome } from '../rules-check';
import { RulesResult } from '../rules-result/rules-result.component';

/**
 * A content entry check: the entry's source line once it validates, then the JSON check itself. The playground
 * has no accounts to look up, so a homebrew source shows its pack id and an unknown author.
 */
@Component({
  selector: 'pio-content-entry-result',
  imports: [Heading, RulesResult, SourceLineView, Stack, Surface, TranslocoPipe],
  templateUrl: './content-entry-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentEntryResult {
  public readonly outcome = input.required<CheckOutcome>();
  public readonly sources = input.required<readonly SourceRef[] | undefined>();
}
