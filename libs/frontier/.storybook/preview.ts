import { applicationConfig } from '@analogjs/storybook-angular';
import type { Decorator, Preview } from '@analogjs/storybook-angular';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { provideFrontierI18nTesting } from '../src/lib/testing/provide-frontier-i18n-testing';
import { ColorMode, Theme } from '../src/lib/theme/theme';

import '../src/styles/frontier.css';

/** Applies the toolbar's theme and colour mode the way ThemeStore does: attributes on `<html>`. */
const withTheme: Decorator = (story, context) => {
  const root = document.documentElement;
  root.dataset['theme'] = String(context.globals['theme'] ?? Theme.Frontier);
  root.dataset['mode'] = String(context.globals['mode'] ?? ColorMode.Dark);
  return story();
};

const preview: Preview = {
  decorators: [
    applicationConfig({
      providers: [
        // Lets fr-link route inside a story without moving the iframe's real URL.
        provideRouter([{ path: '**', children: [] }]),
        provideLocationMocks(),
        provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
        ...provideFrontierI18nTesting(),
      ],
    }),
    withTheme,
  ],
  globalTypes: {
    theme: {
      description: 'Frontier theme',
      toolbar: { title: 'Theme', icon: 'paintbrush', items: Object.values(Theme), dynamicTitle: true },
    },
    mode: {
      description: 'Colour mode',
      toolbar: { title: 'Mode', icon: 'mirror', items: Object.values(ColorMode), dynamicTitle: true },
    },
  },
  initialGlobals: {
    theme: Theme.Frontier,
    mode: ColorMode.Dark,
  },
  parameters: {
    layout: 'padded',
    // The theme paints the canvas (`html` background); Storybook's backgrounds would fight it.
    backgrounds: { disable: true },
    controls: { expanded: true },
    // Axe on every story: a violation fails `nx test-storybook frontier` and shows in the a11y panel.
    a11y: { test: 'error' },
  },
};

export default preview;
