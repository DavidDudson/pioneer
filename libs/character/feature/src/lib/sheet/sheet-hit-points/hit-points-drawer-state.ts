import { Injectable, signal } from '@angular/core';

/** Whether the Hit Point controls are open in their drawer: the Hit Points block opens them. */
@Injectable()
export class HitPointsDrawerState {
  public readonly open = signal(false);
}
