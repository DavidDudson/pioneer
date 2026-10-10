import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { SectionIndex } from '../actions/section-index/section-index.component';
import { SectionLink } from '../actions/section-link/section-link.component';

/** One link in a `SectionIndexHost`: the section anchor it focuses and its name. */
export interface SectionIndexHostLink {
  readonly anchor: string;
  readonly label: string;
}

/** `fr-section-index` filled with `fr-section-link`s, the way a feature fills it. */
@Component({
  selector: 'fr-section-index-host',
  imports: [SectionIndex, SectionLink],
  templateUrl: './section-index-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionIndexHost {
  public readonly label = input.required<string>();
  public readonly sections = input.required<readonly SectionIndexHostLink[]>();
}
