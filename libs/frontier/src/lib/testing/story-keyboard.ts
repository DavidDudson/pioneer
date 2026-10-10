/**
 * Presses keys for real, through Playwright, in a story's `play` under `nx test-storybook frontier`. Storybook's
 * `userEvent` only dispatches synthetic events, which never trigger a native element's default action (Enter
 * or Space on a `<summary>` toggles nothing). Imported lazily: `vitest/browser` exists only inside the runner,
 * so a story using this is tagged `!dev` and stays out of the Storybook UI.
 */
export async function pressKeys(keys: string): Promise<void> {
  const { userEvent } = await import('vitest/browser');
  await userEvent.keyboard(keys);
}
