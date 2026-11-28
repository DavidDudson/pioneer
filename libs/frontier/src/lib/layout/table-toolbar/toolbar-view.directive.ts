import { Directive } from '@angular/core';

/** Marks the toolbar's view content (columns, density), so `fr-table-toolbar` shows a Columns button below `md`. */
@Directive({ selector: '[frToolbarView]' })
export class ToolbarView {}
