import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Button } from '../actions/button/button.component';
import { TextInput } from '../controls/text-input/text-input.component';
import { RovingFocusItem } from '../focus/roving-focus-item.directive';
import { RovingFocus } from '../focus/roving-focus.directive';
import { RovingOrientation } from '../focus/roving-keys';

/** One item in a `RovingFocusHost`: a button, or a text field with `field`. */
export interface RovingFocusHostItem {
  readonly label: string;
  readonly disabled?: boolean;
  readonly selected?: boolean;
  readonly field?: boolean;
}

/** A `[frRovingFocus]` group of `fr-button`s (and optionally a text field), the way a frontier component composes it. */
@Component({
  selector: 'fr-roving-focus-host',
  imports: [Button, RovingFocus, RovingFocusItem, TextInput],
  templateUrl: './roving-focus-host.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RovingFocusHost {
  public readonly items = input.required<readonly RovingFocusHostItem[]>();
  public readonly orientation = input<RovingOrientation>(RovingOrientation.Horizontal);
  public readonly wrap = input(false);
  public readonly columns = input<number | undefined>(undefined);
}
