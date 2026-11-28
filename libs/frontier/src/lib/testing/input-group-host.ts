import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Search } from 'lucide';

import { AsyncStatus } from '../async/async-action';
import { InputAddon } from '../controls/input-group/input-addon.component';
import { InputGroup } from '../controls/input-group/input-group.component';
import { Input } from '../controls/input/input.component';
import { Icon } from '../icon/icon.component';

/** An `fr-input-group` with one addon before the input and three after it. */
@Component({
  selector: 'fr-input-group-host',
  imports: [Icon, Input, InputAddon, InputGroup],
  templateUrl: './input-group-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputGroupHost {
  public readonly invalid = input(false, { transform: booleanAttribute });
  public readonly status = input<AsyncStatus>(AsyncStatus.Idle);

  protected readonly icon = Search;
  protected readonly label = 'Query';
}
