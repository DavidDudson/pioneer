/** How wide a docked drawer is. Resizing steps between them, so the width is always a token. */
export const DrawerWidth = { Narrow: 'narrow', Default: 'default', Wide: 'wide' } as const;
export type DrawerWidth = (typeof DrawerWidth)[keyof typeof DrawerWidth];

/** Narrowest to widest, the order the resize handle steps through. */
export const WIDTHS: readonly DrawerWidth[] = [DrawerWidth.Narrow, DrawerWidth.Default, DrawerWidth.Wide];
/** Each width in rem, as `--container-drawer-*` sets them, for placing a drag between steps. */
const WIDTH_REM: Readonly<Record<DrawerWidth, number>> = { narrow: 20, default: 28, wide: 40 };
/** Each width's message key, spelled out in full. */
export const WIDTH_LABELS: Readonly<Record<DrawerWidth, string>> = {
  narrow: 'frontier.drawer.width.narrow',
  default: 'frontier.drawer.width.default',
  wide: 'frontier.drawer.width.wide',
};
const STORAGE_KEY = 'fr-drawer-width';

function isWidth(value: string | null | undefined): value is DrawerWidth {
  return WIDTHS.some((width) => width === value);
}

export function startResize(event: PointerEvent): void {
  if (event.currentTarget instanceof HTMLElement) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
  }
}

export function endResize(event: PointerEvent): void {
  if (event.currentTarget instanceof HTMLElement && event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }
}

/** The width closest to a drag that ended `rem` wide. */
export function nearestWidth(rem: number): DrawerWidth {
  let nearest: DrawerWidth = DrawerWidth.Default;
  for (const width of WIDTHS) {
    if (Math.abs(WIDTH_REM[width] - rem) < Math.abs(WIDTH_REM[nearest] - rem)) {
      nearest = width;
    }
  }
  return nearest;
}

export function openStorage(document: Document): Storage | undefined {
  try {
    return document.defaultView?.localStorage;
  } catch {
    return undefined;
  }
}

export function readWidth(storage: Storage | undefined): DrawerWidth {
  try {
    const stored = storage?.getItem(STORAGE_KEY);
    return isWidth(stored) ? stored : DrawerWidth.Default;
  } catch {
    return DrawerWidth.Default;
  }
}

export function writeWidth(storage: Storage | undefined, width: DrawerWidth): void {
  try {
    storage?.setItem(STORAGE_KEY, width);
  } catch {
    // Storage full or blocked: the width still applies for this session.
  }
}
