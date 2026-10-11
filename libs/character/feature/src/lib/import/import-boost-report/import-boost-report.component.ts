import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, List, ListItem, LocaleFormat, Stack, Text } from '@pioneer/frontier';
import type { ModifierDifference, UnplacedBoost } from '@pioneer/interop/pathbuilder';

import { ATTRIBUTE_LABEL_KEYS } from '../../data/attribute-label-keys';
import { BOOST_LABEL_KEYS } from '../../sheet/sheet-attributes';
import { SIGNED } from '../import-labels';

/** An attribute whose modifier from the boosts isn't Pathbuilder's, both signed in the viewer's locale. */
interface DifferenceView {
  readonly labelKey: string;
  readonly imported: string;
  readonly derived: string;
}

/** A boost no slot took: what its set is called, at what level, and the attribute Pathbuilder gave it. */
interface UnplacedView {
  readonly boostKey: string;
  readonly level: number;
  readonly attributeKey: string;
}

/** How a Pathbuilder import's boosts landed: whether the modifiers match Pathbuilder's, and any boost no slot took. */
@Component({
  selector: 'pio-import-boost-report',
  imports: [Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-boost-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportBoostReport {
  public readonly modifierDifferences = input.required<readonly ModifierDifference[]>();
  public readonly unplacedBoosts = input.required<readonly UnplacedBoost[]>();

  readonly #format = inject(LocaleFormat);

  protected readonly modifiersMatch = computed(() => this.modifierDifferences().length === 0);
  protected readonly anyUnplaced = computed(() => this.unplacedBoosts().length > 0);

  protected readonly differences = computed((): readonly DifferenceView[] =>
    this.modifierDifferences().map((difference) => ({
      labelKey: ATTRIBUTE_LABEL_KEYS[difference.attribute],
      imported: this.#format.number(difference.imported, SIGNED),
      derived: this.#format.number(difference.derived, SIGNED),
    })),
  );

  protected readonly unplaced = computed((): readonly UnplacedView[] =>
    this.unplacedBoosts().map((boost) => ({
      boostKey: BOOST_LABEL_KEYS[boost.source],
      level: boost.level,
      attributeKey: ATTRIBUTE_LABEL_KEYS[boost.attribute],
    })),
  );
}
