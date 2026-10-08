import { ChangeDetectionStrategy, Component } from '@angular/core';

/** One item of an `fr-list`. The host is `display: contents`, so the `<li>` sits directly in the list's box. */
@Component({
  selector: 'fr-list-item',
  templateUrl: './list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class ListItem {}
