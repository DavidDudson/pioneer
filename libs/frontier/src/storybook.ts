import { applicationConfig } from '@analogjs/storybook-angular';
import type { Decorator, Preview } from '@analogjs/storybook-angular';
import { provideLocationMocks } from '@angular/common/testing';
import type { EnvironmentProviders, Provider } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { ColorMode, Theme } from './lib/theme/theme';

/** Applies the toolbar's theme and colour mode the way ThemeStore does: attributes on `<html>`. */
const withTheme: Decorator = (story, context) => {
  const root = document.documentElement;
  root.dataset['theme'] = String(context.globals['theme'] ?? Theme.Frontier);
  root.dataset['mode'] = String(context.globals['mode'] ?? ColorMode.Dark);
  return story();
};

/**
 * The preview every Pioneer Storybook shares (frontier's and each `ui` library's): theme and colour mode in the
 * toolbar, axe on every story, and a router and query client for components that link or load. `providers` adds
 * the library's own, such as its `en` messages. The caller imports frontier's CSS for its side effect.
 */
export function storybookPreview(providers: readonly (Provider | EnvironmentProviders)[]): Preview {
  return {
    decorators: [
      applicationConfig({
        providers: [
          // Lets links route inside a story without moving the iframe's real URL.
          provideRouter([{ path: '**', children: [] }]),
          provideLocationMocks(),
          provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
          ...providers,
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
      // Axe on every story: a violation fails `test-storybook` and shows in the a11y panel.
      a11y: { test: 'error' },
    },
  };
}
