import { OverlayModule } from '@angular/cdk/overlay';
import { booleanAttribute, ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import type { LucideIcon } from '@lucide/angular';
import { cva } from 'class-variance-authority';

import { Button, ButtonVariant } from '../../actions/button/button.component';
import { Icon } from '../../icon/icon.component';

const originClasses = cva('contents')();
const panelClasses = cva(
  'z-overlay mt-2xs max-w-prose min-w-dropdown border border-line-default bg-surface-overlay p-xs',
)();

/**
 * A button that opens a panel of links, options or controls beside it. The panel is not a dialog: it takes no
 * focus trap, closes on Escape, on a press outside it, and when a link inside it is followed. The trigger is
 * a button named by `label`: icon-only when given an `icon` and no `caption`, text with a caret when given a
 * `caption`, or any projected `[frDropdownTrigger]` content (an avatar). Project the panel's content as the default slot.
 *
 * ```html
 * <fr-dropdown [label]="'menu.sections' | transloco" [icon]="menu">
 *   <fr-link to="/characters">Characters</fr-link>
 * </fr-dropdown>
 * ```
 */
@Component({
  selector: 'fr-dropdown',
  imports: [Button, Icon, OverlayModule],
  templateUrl: './dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
})
export class Dropdown {
  /** Names the trigger button, already translated. */
  public readonly label = input.required<string>();
  /** A Lucide icon for the trigger. With no `caption` the trigger is icon-only. */
  public readonly icon = input<LucideIcon | undefined>(undefined);
  /** Visible trigger text, already translated; the trigger then shows a caret. */
  public readonly caption = input<string | undefined>(undefined);
  /** The trigger is the projected `[frDropdownTrigger]` content rather than an icon or caption. */
  public readonly custom = input(false, { transform: booleanAttribute });
  public readonly open = model(false);

  protected readonly variant = ButtonVariant.Ghost;
  protected readonly caret = LucideChevronDown;
  protected readonly originClasses = originClasses;
  protected readonly panelClasses = panelClasses;

  protected close(): void {
    this.open.set(false);
  }

  /** A press outside the panel closes it, unless it landed in another overlay (a dropdown opened from this panel). */
  protected outside(event: MouseEvent): void {
    const { target } = event;
    const inOverlay = target instanceof Element && target.closest('.cdk-overlay-container') !== null;
    if (!inOverlay) {
      this.close();
    }
  }

  /** A followed link ends the visit to the panel; a control inside it (a toggle, an option) leaves it open. */
  protected pressed(event: Event): void {
    const { target } = event;
    if (target instanceof Element && target.closest('a') !== null) {
      this.close();
    }
  }
}
