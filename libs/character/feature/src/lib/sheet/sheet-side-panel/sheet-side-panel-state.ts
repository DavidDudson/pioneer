import { Injectable, signal } from '@angular/core';
import type { Type } from '@angular/core';

/** The sheet's side panel once the app's loader has delivered it: nothing while it loads, fails or is not provided. */
@Injectable()
export class SheetSidePanelState {
  public readonly panel = signal<Type<unknown> | undefined>(undefined);
}
