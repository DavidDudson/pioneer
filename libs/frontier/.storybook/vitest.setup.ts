import { setProjectAnnotations } from '@analogjs/storybook-angular/testing';
import { afterEach, decorators, initialGlobals, parameters } from '@storybook/addon-a11y/preview';
import { inject } from 'vitest';

import type { ColorMode, Theme } from '../src/lib/theme/theme';
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
