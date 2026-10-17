import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeader } from '@pioneer/frontier';

/** A page that is only its header: stands in for the real pages. */
@Component({
  selector: 'pio-stub-page',
  imports: [PageHeader],
  templateUrl: './stub-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  protected readonly title = 'Moonlit Hunt';
}
