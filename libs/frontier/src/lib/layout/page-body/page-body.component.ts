import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The main content of an `fr-page`. It takes the remaining width beside an `fr-page-aside` and may shrink below
 * its content's width, so wide content scrolls inside its own region instead of widening the page.
 */
@Component({
  selector: 'fr-page-body',
  templateUrl: './page-body.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block min-w-none flex-1' },
})
export class PageBody {}
