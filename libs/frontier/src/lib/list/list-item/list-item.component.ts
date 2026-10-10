import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * One item of an `fr-list`. The host is the item: `role="listitem"` and `display: list-item`, so it sits directly
 * in the `<ul>` / `<ol>` and keeps its marker. An `<li>` inside a custom-element host would leave the list with
 * children it may not have.
 */
@Component({
  selector: 'fr-list-item',
  templateUrl: './list-item.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem', class: 'list-item' },
})
export class ListItem {}
