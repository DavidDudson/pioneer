import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Stack, Surface } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';
import { RichTextView } from '@pioneer/rules/ui';

import type { CheckOutcome } from '../rules-check';
import { RulesResult } from '../rules-result/rules-result.component';

/** A rich text check: the text as it renders once it validates, then the JSON check itself. */
@Component({
  selector: 'pio-rich-text-result',
  imports: [Heading, RichTextView, RulesResult, Stack, Surface, TranslocoPipe],
  templateUrl: './rich-text-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextResult {
  public readonly outcome = input.required<CheckOutcome>();
  public readonly preview = input.required<RichText | undefined>();
}
