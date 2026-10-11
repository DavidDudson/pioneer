import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Stack } from '../../layout/stack/stack.component';

/**
 * The index of a long page's `fr-section`s: a labelled `<nav>` of `fr-section-link` skip links, one per section in
 * page order, that wraps onto more lines on a narrow screen. Following a link moves focus to that section's heading
 * without navigating, so the next Tab starts inside the section. Put it at the top of the page, after the shell's own
 * skip link.
 *
 * ```html
 * <fr-section-index [label]="'character.sheet.sections' | transloco">
 *   <fr-section-link anchor="sheet-identity">{{ 'character.sheet.identityHeading' | transloco }}</fr-section-link>
 *   <fr-section-link anchor="sheet-attributes">{{ 'character.sheet.attributesHeading' | transloco }}</fr-section-link>
 * </fr-section-index>
 * ```
 */
@Component({
  selector: 'fr-section-index',
  imports: [Stack],
  templateUrl: './section-index.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class SectionIndex {
  /** Names the navigation landmark, already translated. */
  public readonly label = input.required<string>();
}
