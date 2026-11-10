import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Dropdown, Link, Stack } from '@pioneer/frontier';
import { Menu } from 'lucide';

/** The site's sections, in an icon-only dropdown beside the account menu. */
@Component({
  selector: 'pio-sections-menu',
  imports: [Dropdown, Link, Stack, TranslocoPipe],
  templateUrl: './sections-menu.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SectionsMenu {
  protected readonly icon = Menu;
}
