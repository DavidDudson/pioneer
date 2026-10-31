import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Heading } from '../../text/heading/heading.component';
import { Stack } from '../stack/stack.component';
import { Surface } from '../surface/surface.component';

/**
 * One section of a long page, such as the character sheet: a raised panel that is a `<section>` region landmark,
 * labelled by its level 2 heading, so both the landmark list and the heading list reach it. `anchor` is the heading's
 * id: `fr-section-index` links to it, and following a link moves focus to the heading.
 *
 * ```html
 * <fr-section anchor="sheet-identity" [heading]="'character.sheet.identityHeading' | transloco">
 *   <fr-grid [columns]="3">…</fr-grid>
 * </fr-section>
 * ```
 */
@Component({
  selector: 'fr-section',
  imports: [Heading, Stack, Surface],
  templateUrl: './section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.block]': '!concealed()', '[class.hidden]': 'concealed()' },
})
export class Section {
  /** The heading's id, unique on the page; the region is labelled by it and skip links target it. */
  public readonly anchor = input.required<string>();
  /** The section's name, already translated. */
  public readonly heading = input.required<string>();
  /** Keeps the section rendered, with its state, and out of sight and the accessibility tree; for the closed ones of a set shown one at a time. */
  public readonly concealed = input(false, { transform: booleanAttribute });
}
