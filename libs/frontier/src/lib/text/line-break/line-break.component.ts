import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A line break inside running text, where the line division is part of the content (an address, a stat line,
 * rules text that breaks a line). Never for spacing: use `fr-stack` for that.
 */
@Component({
  selector: 'fr-line-break',
  templateUrl: './line-break.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class LineBreak {}
