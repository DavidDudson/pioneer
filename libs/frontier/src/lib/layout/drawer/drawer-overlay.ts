/** The `lg` container size in rem, as `--container-lg` sets it. Below it the drawer is a full-screen overlay. */
const LG_REM = 56;

/**
 * Shows `dialog` modal (top layer, backdrop, focus trapped, page inert) or docked (non-modal), keeping its scroll.
 * A dialog cannot change mode while open, so it closes first; closing hides it and resets its scroll.
 */
export function showDialog(dialog: HTMLDialogElement, modal: boolean): void {
  const { scrollTop } = dialog;
  if (dialog.open) {
    dialog.close();
  }
  if (modal) {
    dialog.showModal();
  } else {
    dialog.show();
  }
  dialog.scrollTop = scrollTop;
}

/** `element`, or the nearest ancestor that takes room when it is a `display: contents` wrapper, which has no width. */
function roomOf(element: Element): Element {
  const view = element.ownerDocument.defaultView;
  let room = element;
  while (view?.getComputedStyle(room).display === 'contents' && room.parentElement !== null) {
    room = room.parentElement;
  }
  return room;
}

/**
 * Calls `onChange` with whether `container` is narrower than `lg`, now and on every resize. The container's width is
 * what counts, not the viewport's: the drawer's own width beside the page says nothing about the room the page has.
 * Returns a function that stops watching.
 */
export function watchNarrow(container: Element, remPx: number, onChange: (narrow: boolean) => void): () => void {
  const observer = new ResizeObserver((entries) => {
    const width = entries.at(-1)?.contentRect.width;
    if (width !== undefined) {
      onChange(width < LG_REM * remPx);
    }
  });
  observer.observe(roomOf(container));
  return () => {
    observer.disconnect();
  };
}
