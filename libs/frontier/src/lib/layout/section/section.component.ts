import { NgTemplateOutlet } from '@angular/common';
import { booleanAttribute, ChangeDetectionStrategy, Component, contentChild, input, linkedSignal } from '@angular/core';
import type { Signal } from '@angular/core';

import { Heading } from '../../text/heading/heading.component';
import { Stack } from '../stack/stack.component';
import { Surface } from '../surface/surface.component';
import { SectionBody } from './section-body.directive';

/**
 * One section of a long page, such as the character sheet: a raised panel that is a `<section>` region landmark,
 * labelled by its level 2 heading, so both the landmark list and the heading list reach it. `anchor` is the heading's
 * id: `fr-section-index` links to it, and following a link moves focus to the heading.
 *
 * Put the content in an `<ng-template frSectionBody>` and it is built only once the section is first shown (not
 * `concealed`), then kept. Projected content is always built, even while concealed, so use the template for any set
 * of sections shown one at a time.
 *
 * ```html
 * <fr-section anchor="sheet-identity" [heading]="'character.sheet.identityHeading' | transloco">
 *   <ng-template frSectionBody>
 *     <fr-grid [columns]="3">…</fr-grid>
 *   </ng-template>
 * </fr-section>
 * ```
 */
@Component({
  selector: 'fr-section',
  imports: [Heading, NgTemplateOutlet, Stack, Surface],
  templateUrl: './section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.block]': '!concealed()', '[class.hidden]': 'concealed()' },
})
export class Section {
  /** The heading's id, unique on the page; the region is labelled by it and skip links target it. */
  public readonly anchor = input.required<string>();
  /** The section's name, already translated. */
  public readonly heading = input.required<string>();
  /** Keeps the section, with its state, out of sight and the accessibility tree; for the closed ones of a set shown one at a time. */
  public readonly concealed = input(false, { transform: booleanAttribute });

  protected readonly body = contentChild(SectionBody);
  /** Whether the section has been shown: its body is built from then on. */
  protected readonly opened: Signal<boolean> = linkedSignal<boolean, boolean>({
    source: this.concealed,
    computation: (concealed, previous) => previous?.value === true || !concealed,
  });
}
