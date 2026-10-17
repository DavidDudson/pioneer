import { setProjectAnnotations } from '@analogjs/storybook-angular/testing';
import type { ColorMode, Theme } from '@pioneer/frontier';
import { afterEach, decorators, initialGlobals, parameters } from '@storybook/addon-a11y/preview';
import { inject } from 'vitest';

import preview from './preview';

declare module 'vitest' {
  export interface ProvidedContext {
    readonly theme: Theme;
    readonly mode: ColorMode;
  }
}

/** Stories render with this project's theme and colour mode (vitest.config.ts), as if picked in the toolbar. */
setProjectAnnotations([
  { afterEach, decorators, initialGlobals, parameters },
  preview,
  { initialGlobals: { theme: inject('theme'), mode: inject('mode') } },
]);
