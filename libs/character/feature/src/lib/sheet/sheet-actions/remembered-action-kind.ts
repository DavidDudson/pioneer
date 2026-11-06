import { Injectable, signal } from '@angular/core';
import type { ActionCategory } from '@pioneer/rules/ui';

/**
 * The kind of action whose subtab the Actions tab last had open, kept while the app runs so a sheet tab opened next
 * (a route of its own, whose address carries no query) opens on the same subtab.
 */
@Injectable({ providedIn: 'root' })
export class RememberedActionKind {
  public readonly kind = signal<ActionCategory | undefined>(undefined);
}
