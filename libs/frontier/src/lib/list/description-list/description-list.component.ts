import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { cva } from 'class-variance-authority';

import { Box } from '../../layout/box/box.component';
import { Container, gapVariants, Space } from '../../tokens';

const listVariants = cva('flex flex-col', { variants: { gap: gapVariants } });

/**
 * Labelled values (Armor Class 18, Perception +7) as a semantic `<dl>` of `fr-description-item`s. Each row stacks
 * its term above its value when narrow and puts them side by side, terms in one column, once the list is
 * `columnsFrom` wide. The `<dl>` sits in an `fr-box`, whose width the rows' `fr-grid`s query, so each `<dt>` /
 * `<dd>` pair is grouped by a single `<div>` as the content model allows.
 *
 * ```html
 * <fr-description-list>
 *   <fr-description-item [term]="'sheet.ac' | transloco"><fr-text numeric>{{ ac }}</fr-text></fr-description-item>
 *   <fr-description-item [term]="'sheet.perception' | transloco">
 *     <fr-disclosure><fr-text frDisclosureSummary>+7</fr-text><pio-breakdown [statistic]="perception" /></fr-disclosure>
 *   </fr-description-item>
 * </fr-description-list>
 * ```
 */
@Component({
  selector: 'fr-description-list',
  imports: [Box],
  templateUrl: './description-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class DescriptionList {
  public readonly gap = input<Space>(Space.Xs);
  /** Container size from which a row puts its term and value side by side. */
  public readonly columnsFrom = input<Container>(Container.Sm);

  protected readonly classes = computed(() => listVariants({ gap: this.gap() }));
}
