import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PageHeader } from '@pioneer/frontier';

/** A page that is only its header, above the outlet of the child route below it: stands in for the real pages. */
@Component({
  selector: 'pio-stub-page',
  imports: [PageHeader, RouterOutlet],
  templateUrl: './stub-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StubPage {
  protected readonly title = 'Briar Rose';
}
