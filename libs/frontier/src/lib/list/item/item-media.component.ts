import { ChangeDetectionStrategy, Component } from '@angular/core';

/** The leading part of an `fr-list-item`: an `fr-avatar`, an icon or an image, kept at its own size. */
@Component({
  selector: 'fr-item-media',
  templateUrl: './item-media.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex shrink-0 items-center' },
})
export class ItemMedia {}
