/**
 * Moves the real mouse over an element, through Playwright, in a story's `play` under `nx test-storybook frontier`.
 * Storybook's `userEvent.hover` only dispatches synthetic events, which never match `:hover`. Imported lazily:
 * `vitest/browser` exists only inside the runner, so a story using this is tagged `!dev`.
 */
export async function hover(element: Element): Promise<void> {
  const { userEvent } = await import('vitest/browser');
  await userEvent.hover(element);
}
