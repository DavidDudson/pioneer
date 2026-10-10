import type { CDPSession } from '@vitest/browser-playwright';

/**
 * Turns on forced colours (Windows High Contrast) for a story under `nx test-storybook frontier`, through the Chrome
 * DevTools Protocol: Chromium then paints with its forced palette, as Windows does. Use it as the story's
 * `beforeEach`. The emulation is on the runner's page, not the story's frame, so it is turned off when the test
 * finishes, pass or fail; a Storybook cleanup would only run before the next story in the same file. Imported
 * lazily: `vitest` and `vitest/browser` exist only inside the runner, so a story using this is tagged `!dev`.
 */
export async function emulateForcedColors(): Promise<void> {
  const [{ cdp }, { onTestFinished }] = await Promise.all([import('vitest/browser'), import('vitest')]);
  // The runner uses the Playwright provider, whose session has a typed `send`.
  const session: CDPSession = cdp();
  await session.send('Emulation.setEmulatedMedia', { features: [{ name: 'forced-colors', value: 'active' }] });
  onTestFinished(async () => {
    await session.send('Emulation.setEmulatedMedia', { features: [] });
  });
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

/**
 * The colours painted across the middle of an element, at fractions of its width, from a real screenshot. For parts
 * `getComputedStyle` can't read, such as a meter's fill pseudo-element.
 */
export async function paintedAcross(element: Element, fractions: readonly number[]): Promise<string[]> {
  const { page } = await import('vitest/browser');
  const base64 = await page.elementLocator(element).screenshot({ save: false });
  const image = new Image();
  image.src = `data:image/png;base64,${base64}`;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context?.drawImage(image, 0, 0);
  const middle = Math.floor(image.height / 2);
  return fractions.map((fraction) => {
    const [red, green, blue] = context?.getImageData(Math.floor(image.width * fraction), middle, 1, 1).data ?? [];
    return `rgb(${red}, ${green}, ${blue})`;
  });
}
