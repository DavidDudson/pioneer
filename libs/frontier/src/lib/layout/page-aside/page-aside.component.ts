import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Supporting content beside an `fr-page-body`: a complementary landmark. It sits to the right of the body once the
 * page is wide enough and stacks under it below that.
 */
@Component({
  selector: 'fr-page-aside',
  templateUrl: './page-aside.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-none @lg:w-aside @lg:shrink-0' },
})
export class PageAside {
  /** The landmark's name, already translated. */
  public readonly label = input.required<string>();
}
