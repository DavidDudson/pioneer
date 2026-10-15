/** Whether typing in `target` would be eaten by a shortcut: a text field or anything editable. */
function takesText(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName);
}

/**
 * Whether `event` opens the global search: Ctrl or Cmd with K anywhere, or a bare slash outside a text field, as
 * on GitHub.
 */
export function isSearchShortcut(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) {
    return false;
  }
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
    return true;
  }
  const bare = !event.ctrlKey && !event.metaKey && !event.altKey;
  return bare && event.key === '/' && !takesText(event.target);
}
