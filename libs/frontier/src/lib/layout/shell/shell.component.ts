import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Text } from '../../text/text.directive';
import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';

/**
 * App chrome: top bar with brand and nav slot, routed content below.
 * Pads for notches and home indicators (needs `viewport-fit=cover`).
 * Built only from layout primitives; it has no responsive CSS of its own.
 */
@Component({
  selector: 'fr-shell',
  imports: [Box, Stack, Text],
  templateUrl: './shell.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex min-h-dvh flex-col bg-surface-canvas pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
  },
})
export class Shell {
  public readonly brand = input.required<string>();
}
