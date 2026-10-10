import type { ValueOf } from '@pioneer/shared/kernel';

/** Which arrow keys move focus through a roving-focus group. */
export const RovingOrientation = {
  /** Left and Right, flipped in a right-to-left layout. */
  Horizontal: 'horizontal',
  /** Up and Down. */
  Vertical: 'vertical',
  /** Left and Right along a row, Up and Down between rows. */
  Grid: 'grid',
} as const;
export type RovingOrientation = ValueOf<typeof RovingOrientation>;

/** A key press in a roving-focus group, and where focus is. */
export interface RovingKey {
  readonly key: string;
  readonly ctrl: boolean;
  readonly orientation: RovingOrientation;
  readonly rtl: boolean;
  /** Index of the focused item. */
  readonly from: number;
  /** Which items can take focus, in order. */
  readonly enabled: readonly boolean[];
  /** Grid columns; ignored by the other orientations. */
  readonly columns: number;
  /** Past an end, go round to the other one. Horizontal and vertical only. */
  readonly wrap: boolean;
}

const NEXT = 1;
const PREVIOUS = -1;

interface Range {
  readonly floor: number;
  readonly ceiling: number;
}

/** Steps from the focused item, within a range. */
interface Step {
  readonly kind: 'step';
  readonly step: number;
  readonly range: Range;
}

/** The first enabled item from one edge of a range, moving inward. */
interface Edge {
  readonly kind: 'edge';
  readonly toward: number;
  readonly range: Range;
}

type Move = Step | Edge;

/** The index of the item `press` moves focus to, or `undefined` when the key does nothing here. */
export function rovingTarget(press: RovingKey): number | undefined {
  const move = press.orientation === RovingOrientation.Grid ? gridMove(press) : linearMove(press);
  if (move === undefined) {
    return undefined;
  }
  const to = move.kind === 'edge' ? edgeFrom(move, press.enabled) : stepFrom(move, press);
  return to === press.from ? undefined : to;
}

/** The back and forward keys: Up and Down, or Left and Right swapped in a right-to-left layout. */
function backAndForward(press: RovingKey): readonly [string, string] {
  if (press.orientation === RovingOrientation.Vertical) {
    return ['ArrowUp', 'ArrowDown'];
  }
  return press.rtl ? ['ArrowRight', 'ArrowLeft'] : ['ArrowLeft', 'ArrowRight'];
}

function linearMove(press: RovingKey): Move | undefined {
  if (press.ctrl) {
    return undefined;
  }
  return lineMove(press, { floor: 0, ceiling: press.enabled.length - 1 });
}

/** Back, forward, Home and End within `range`. */
function lineMove(press: RovingKey, range: Range): Move | undefined {
  const [back, forward] = backAndForward(press);
  switch (press.key) {
    case back: {
      return { kind: 'step', step: PREVIOUS, range };
    }
    case forward: {
      return { kind: 'step', step: NEXT, range };
    }
    case 'Home': {
      return { kind: 'edge', toward: NEXT, range };
    }
    case 'End': {
      return { kind: 'edge', toward: PREVIOUS, range };
    }
    default: {
      return undefined;
    }
  }
}

function gridMove(press: RovingKey): Move | undefined {
  const whole = { floor: 0, ceiling: press.enabled.length - 1 };
  if (press.ctrl) {
    return gridCorner(press.key, whole);
  }
  const columns = Math.max(1, press.columns);
  if (press.key === 'ArrowUp' || press.key === 'ArrowDown') {
    return { kind: 'step', step: press.key === 'ArrowUp' ? -columns : columns, range: whole };
  }
  const rowStart = press.from - (press.from % columns);
  return lineMove(press, { floor: rowStart, ceiling: Math.min(rowStart + columns - 1, whole.ceiling) });
}

/** Ctrl+Home and Ctrl+End: the first and last item. */
function gridCorner(key: string, range: Range): Move | undefined {
  if (key === 'Home') {
    return { kind: 'edge', toward: NEXT, range };
  }
  return key === 'End' ? { kind: 'edge', toward: PREVIOUS, range } : undefined;
}

/** Steps from the focused item to the next enabled one in range, going round if the group wraps. */
function stepFrom(move: Step, press: RovingKey): number | undefined {
  const { floor, ceiling } = move.range;
  const wraps = press.wrap && press.orientation !== RovingOrientation.Grid;
  let index = press.from;
  for (let tries = floor; tries <= ceiling; tries += 1) {
    index = wraps ? wrapInto(index + move.step, move.range) : index + move.step;
    if (index < floor || index > ceiling || index === press.from) {
      return undefined;
    }
    if (press.enabled[index] === true) {
      return index;
    }
  }
  return undefined;
}

function wrapInto(index: number, { floor, ceiling }: Range): number {
  if (index < floor) {
    return ceiling;
  }
  return index > ceiling ? floor : index;
}

function edgeFrom(move: Edge, enabled: readonly boolean[]): number | undefined {
  const { floor, ceiling } = move.range;
  const start = move.toward === NEXT ? floor : ceiling;
  for (let index = start; index >= floor && index <= ceiling; index += move.toward) {
    if (enabled[index] === true) {
      return index;
    }
  }
  return undefined;
}
