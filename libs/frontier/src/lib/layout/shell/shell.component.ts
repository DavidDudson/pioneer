import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Text } from '../../text/text.directive';

/** App chrome: top bar with brand and nav slot, routed content below. */
@Component({
  selector: 'fr-shell',
  imports: [Text],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-surface-canvas' },
})
export class Shell {
  public readonly brand = input.required<string>();
}
