import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, Heading, List, ListItem, Message, Stack, Surface, Text } from '@pioneer/frontier';
import { HomebrewEntryOutcome } from '@pioneer/interop/pioneer';
import type { HomebrewPackReport } from '@pioneer/interop/pioneer';

import { HOMEBREW_OUTCOME_KEYS, HOMEBREW_STATUS_KEYS } from '../pioneer-import-labels';

/** One homebrew entry in the file and what importing does with it, ready to show. */
interface EntryView {
  readonly name: string;
  readonly outcomeKey: string;
}

/** One homebrew pack in the file, ready to show. */
interface PackView {
  readonly pack: string;
  readonly title: string;
  readonly publisher: string;
  readonly statusKey: string;
  readonly entries: readonly EntryView[];
}

/**
 * The homebrew a Pioneer file carries, pack by pack (nothing when it carries none): who made it, what importing does to the pack, and for each entry
 * whether it is added, reused or clashes with a different one already on the server (#667, ADR-0059).
 */
@Component({
  selector: 'pio-pioneer-import-homebrew',
  imports: [Disclosure, Heading, List, ListItem, Message, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './pioneer-import-homebrew.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PioneerImportHomebrew {
  public readonly packs = input.required<readonly HomebrewPackReport[]>();

  protected readonly views = computed((): readonly PackView[] =>
    this.packs().map(({ pack, title, publisher, status, entries }) => ({
      pack,
      title,
      publisher,
      statusKey: HOMEBREW_STATUS_KEYS[status],
      entries: entries.map(({ name, outcome }) => ({ name, outcomeKey: HOMEBREW_OUTCOME_KEYS[outcome] })),
    })),
  );

  protected readonly clashes = computed((): number =>
    this.packs().reduce(
      (count, { entries }) => count + entries.filter(({ outcome }) => outcome === HomebrewEntryOutcome.Clash).length,
      0,
    ),
  );
}
