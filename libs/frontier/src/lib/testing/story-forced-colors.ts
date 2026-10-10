import type { CDPSession } from '@vitest/browser-playwright';

type Cleanup = () => Promise<void>;

/**
 * Turns on forced colours (Windows High Contrast) for a story under `nx test-storybook frontier`, through the Chrome
 * DevTools Protocol: Chromium then paints with its forced palette, as Windows does. Use it as the story's
 * `beforeEach`; the cleanup it returns turns forced colours off again. Imported lazily: `vitest/browser` exists only
 * inside the runner, so a story using this is tagged `!dev`.
 */
export async function emulateForcedColors(): Promise<Cleanup> {
  const { cdp } = await import('vitest/browser');
  // The runner uses the Playwright provider, whose session has a typed `send`.
  const session: CDPSession = cdp();
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  return async (): Promise<void> => {
    await session.send('Emulation.setEmulatedMedia', { features: [] });
  };
}

/** What a CSS system colour (`Highlight`, `CanvasText`, …) resolves to in the current palette, as `rgb(…)`. */
export function systemColour(keyword: string): string {
  const probe = document.createElement('span');
  probe.style.color = keyword;
  document.body.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();
  return color;
}
