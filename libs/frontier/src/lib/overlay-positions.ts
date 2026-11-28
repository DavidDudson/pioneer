import type { ConnectedPosition } from '@angular/cdk/overlay';
import type { ValueOf } from '@pioneer/shared/kernel';

/** Which edge of the origin a panel lines up with. */
export const OverlayAlign = { Start: 'start', End: 'end' } as const;

export type OverlayAlign = ValueOf<typeof OverlayAlign>;

/** The gap between an overlay panel and its origin, in CSS pixels: 0.25rem, the `2xs` space step. CDK takes pixels. */
const OVERLAY_GAP_PX = 4;

/**
 * Where a panel opens: under its origin, lined up with the origin's `align` edge, and above it when there is no
 * room below. The gap is each position's own `offsetY`, so it flips with the panel: it is never a margin on the panel.
 */
export function overlayPositions(align: OverlayAlign): Array<ConnectedPosition> {
  return [
    { originX: align, originY: 'bottom', overlayX: align, overlayY: 'top', offsetY: OVERLAY_GAP_PX },
    { originX: align, originY: 'top', overlayX: align, overlayY: 'bottom', offsetY: -OVERLAY_GAP_PX },
  ];
}
