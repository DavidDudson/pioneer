import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Tab } from '../actions/tab/tab.component';
import { Tabs } from '../actions/tabs/tabs.component';

/** One tab in a `TabsHost`. */
export interface TabsHostTab {
  readonly label: string;
  readonly to: string;
  readonly exact?: boolean;
}

/** `fr-tabs` filled with `fr-tab`s, the way a feature fills it. */
@Component({
  selector: 'fr-tabs-host',
  imports: [Tab, Tabs],
  templateUrl: './tabs-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsHost {
  public readonly label = input.required<string>();
  public readonly tabs = input.required<readonly TabsHostTab[]>();
}
