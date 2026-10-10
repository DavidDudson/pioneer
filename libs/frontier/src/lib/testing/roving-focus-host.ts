import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Button } from '../actions/button/button.component';
import { RovingFocusItem } from '../focus/roving-focus-item.directive';
import { RovingFocus } from '../focus/roving-focus.directive';
import { RovingOrientation } from '../focus/roving-keys';

/** One button in a `RovingFocusHost`. */
export interface RovingFocusHostItem {
  readonly label: string;
  readonly disabled?: boolean;
  readonly selected?: boolean;
}

/** A `[frRovingFocus]` group of `fr-button`s, the way a frontier component composes it. */
@Component({
  selector: 'fr-roving-focus-host',
  imports: [Button, RovingFocus, RovingFocusItem],
  templateUrl: './roving-focus-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RovingFocusHost {
  public readonly items = input.required<readonly RovingFocusHostItem[]>();
  public readonly orientation = input<RovingOrientation>(RovingOrientation.Horizontal);
  public readonly wrap = input(false);
  public readonly columns = input<number | undefined>(undefined);
}
