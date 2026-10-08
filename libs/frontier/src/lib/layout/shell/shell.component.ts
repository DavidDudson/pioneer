import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Text } from '../../text/text/text.component';
import { Box } from '../box/box.component';
import { Stack } from '../stack/stack.component';

const shellClasses = cva('flex min-h-dvh flex-col bg-surface-canvas pl-safe-left pr-safe-right')();
const headerClasses = cva('sticky top-none z-sticky border-b border-line-subtle bg-surface-base pt-safe-top')();
const footerClasses = cva('border-t border-line-subtle bg-surface-base pb-safe-bottom')();

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
  host: { '[class]': 'hostClasses' },
})
export class Shell {
  public readonly brand = input.required<string>();

  protected readonly hostClasses = shellClasses;
  protected readonly headerClasses = headerClasses;
  protected readonly brandClasses = cva('shrink-0')();
  protected readonly navClasses = cva('min-w-none overflow-x-auto')();
  protected readonly contentClasses = cva('flex-1')();
  protected readonly footerClasses = footerClasses;
}
