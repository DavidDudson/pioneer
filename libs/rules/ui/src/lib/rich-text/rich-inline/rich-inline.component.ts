import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { InlineContent } from '@pioneer/rules/sdk';

import { RichMark } from '../rich-mark/rich-mark.component';
import { RichRef } from '../rich-ref/rich-ref.component';
import { RichRun } from '../rich-run/rich-run.component';
import { RichValue } from '../rich-value/rich-value.component';

/** A run of inline nodes: a paragraph's or heading's content, or one table cell. */
@Component({
  selector: 'pio-rich-inline',
  imports: [RichMark, RichRef, RichRun, RichValue],
  templateUrl: './rich-inline.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichInline {
  public readonly content = input.required<InlineContent>();
}
