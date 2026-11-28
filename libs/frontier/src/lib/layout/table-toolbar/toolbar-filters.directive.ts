import { Directive } from '@angular/core';

/** Marks the toolbar's filters content, so `fr-table-toolbar` shows a Filters button below `md` when there is some. */
@Directive({ selector: '[frToolbarFilters]' })
export class ToolbarFilters {}
