import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Text } from '../../text/text.directive';
import { Stack } from '../stack/stack.component';

/**
 * A routed page: title, optional description, actions slot, content.
 * Put actions in `<fr-stack frPageActions>` (or any element with the attribute).
 */
@Component({
  selector: 'fr-page',
  imports: [Stack, Text],
  templateUrl: './page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block mx-auto w-full max-w-6xl px-md py-xl sm:px-xl' },
})
export class Page {
  public readonly title = input.required<string>();
  public readonly description = input<string | undefined>(undefined);
}
