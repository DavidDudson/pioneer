import { Injectable, signal } from '@angular/core';

/** Whether the character configuration drawer is open, shared by the menu entry that opens it and the drawer. */
@Injectable()
export class SheetConfigurationState {
  public readonly open = signal(false);
}
