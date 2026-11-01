import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Tab, Tabs } from '@pioneer/frontier';
import { ChoiceState } from '@pioneer/rules/ui';
import type { ChoiceLine } from '@pioneer/rules/ui';

import { BASE_LEVEL, sectionPath, SHEET_LEVELS } from '../sheet-sections';
import { SheetState } from '../sheet-state';

/** One level tab: the route below the open tab's, the message naming it, and whether it has choices still to make. */
interface LevelLink {
  readonly to: readonly string[];
  readonly headingKey: string;
  readonly headingParams: Readonly<Record<string, number>> | undefined;
  readonly unresolved: boolean;
}

/** Whether a choice still needs the player: it has no pick, or its pick no longer holds. */
function isUnresolved(line: ChoiceLine): boolean {
  return line.state === ChoiceState.Open || line.state === ChoiceState.Invalid;
}

/**
 * The Plan tab's levels as a vertical list of tabs, level 0 for the base character and then 1 to 20, each a route below
 * the tab's so the address says which is shown. A level with choices still to make carries a marker. It is a nav of
 * links, not a `tablist`: there are no hidden panels, the routed level renders beside it. Below the `md` width the list
 * is a row that scrolls sideways.
 */
@Component({
  selector: 'pio-sheet-level-tabs',
  imports: [Badge, Tab, Tabs, TranslocoPipe],
  templateUrl: './sheet-level-tabs.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SheetLevelTabs {
  readonly #picks = inject(SheetState).picks;

  protected readonly tone = BadgeTone.Warning;

  /** The levels with a choice still to make, by level. */
  readonly #unresolved = computed((): ReadonlySet<number> => {
    const levels = new Set<number>();
    for (const row of this.#picks.timeline() ?? []) {
      if (row.lines.some((line) => isUnresolved(line))) {
        levels.add(row.level);
      }
    }
    if ((this.#picks.choices() ?? []).some((line) => line.level === undefined && isUnresolved(line))) {
      levels.add(BASE_LEVEL);
    }
    return levels;
  });

  protected readonly links = computed((): readonly LevelLink[] => {
    const unresolved = this.#unresolved();
    return SHEET_LEVELS.map((section, index) => ({
      to: ['..', sectionPath(section)],
      headingKey: section.headingKey,
      headingParams: section.headingParams,
      unresolved: unresolved.has(BASE_LEVEL + index),
    }));
  });
}
