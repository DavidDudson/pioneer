import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CharacterId } from '@pioneer/character/domain';
import { CHARACTER_SHEET_PAGE_PROVIDERS, SheetLevelPlan, SheetState } from '@pioneer/character/feature';
import { Link, Page, PageBody, PageHeader, Stack, Surface, Text } from '@pioneer/frontier';

/** The level whose choices this page offers. */
const FIRST_LEVEL = 1;

/**
 * The second half of the level 1 builder: the choices level 1 gives the character just made (ability boosts, skills,
 * feats), as the planner shows them. The character is saved already; the link opens its sheet, where equipment and
 * spells are chosen.
 */
@Component({
  selector: 'pio-create-level-one-page',
  imports: [Link, Page, PageBody, PageHeader, SheetLevelPlan, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './create-level-one-page.component.html',
  providers: CHARACTER_SHEET_PAGE_PROVIDERS,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateLevelOnePage {
  public readonly id = input.required({ transform: (id: string): CharacterId => CharacterId.parse(id) });

  protected readonly sheet = inject(SheetState);
  protected readonly level = FIRST_LEVEL;

  public constructor() {
    effect(() => {
      this.sheet.store.select(this.id());
    });
    this.sheet.timelineWanted.set(true);
  }
}
