import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { TabList } from '../actions/tab-list/tab-list.component';
import type { SelectOption } from '../controls/select/select.component';

/** The kinds a `TabListHost` offers. */
const TAB_LIST_KINDS: readonly SelectOption<string>[] = [
  { value: 'strikes', label: 'Strikes' },
  { value: 'spells', label: 'Spells' },
  { value: 'items', label: 'Items' },
];

/** `fr-tab-list` with three kinds and the second chosen, the way a feature fills it. */
@Component({
  selector: 'fr-tab-list-host',
  imports: [TabList],
  templateUrl: './tab-list-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabListHost {
  protected readonly label = 'Kinds of action';
  protected readonly options = TAB_LIST_KINDS;
  public readonly chosen = signal<string | undefined>('spells');
}
