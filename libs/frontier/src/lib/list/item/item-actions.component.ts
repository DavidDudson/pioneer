import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The trailing part of an `fr-list-item`: buttons or a menu, pushed to the end edge. */
@Component({
  selector: 'fr-item-actions',
  templateUrl: './item-actions.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex shrink-0 items-center gap-xs' },
})
export class ItemActions {}
