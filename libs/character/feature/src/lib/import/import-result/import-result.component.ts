import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { SheetMode } from '@pioneer/character/domain';
import {
  Badge,
  Button,
  Disclosure,
  Heading,
  List,
  ListItem,
  Link,
  LocaleFormat,
  Stack,
  Surface,
  Text,
} from '@pioneer/frontier';
import type { BadgeTone } from '@pioneer/frontier';
import type { CharacterImportReport, ImportKind } from '@pioneer/interop/pathbuilder';
import type { ContentId, Selector } from '@pioneer/rules/sdk';
import type { NamedStatistic } from '@pioneer/rules/ui';
import { filter, merge } from 'rxjs';

import { ImportBoostReport } from '../import-boost-report/import-boost-report.component';
import { ImportDiscrepancyReport } from '../import-discrepancy-report/import-discrepancy-report.component';
import { KIND_KEYS, REASON_KEYS, REASON_TONES, UNCARRIED_KEYS } from '../import-labels';
import { ImportSkillReport } from '../import-skill-report/import-skill-report.component';
import { ImportSpellReport } from '../import-spell-report/import-spell-report.component';

/** One name that was not carried over, as the list shows it. */
interface NameView {
  readonly name: string;
  readonly occurrences: number;
  readonly repeated: boolean;
  readonly reasonKey: string;
  readonly tone: BadgeTone;
}

interface GroupView {
  readonly kind: ImportKind;
  readonly kindKey: string;
  readonly names: readonly NameView[];
}

/** What a Pathbuilder import left behind, shown on the new character until the viewer dismisses it. */
@Component({
  selector: 'pio-import-result',
  imports: [
    Badge,
    Button,
    Disclosure,
    Heading,
    ImportBoostReport,
    ImportDiscrepancyReport,
    ImportSkillReport,
    Link,
    ImportSpellReport,
    List,
    ListItem,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './import-result.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportResult {
  public readonly report = input.required<CharacterImportReport>();
  /** What the engine derives for the imported character, by statistic, for the breakdown of each that differs. */
  public readonly statistics = input<ReadonlyMap<Selector, NamedStatistic>>(new Map());
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  public readonly dismissed = output();

  /** The Exploration tab, beside this one, where the inventory and its flagged lines are. */
  protected readonly inventory = ['..', SheetMode.Exploration];

  readonly #format = inject(LocaleFormat);
  readonly #i18n = inject(TranslocoService);
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  /** The fields the character couldn't hold, as a list in the viewer's locale; empty when there are none. */
  protected readonly notCarried = computed((): string => {
    // Re-run when messages change, not only when the report does.
    this.#messages();
    return this.#format.list(this.report().notCarried.map((field) => this.#i18n.translate(UNCARRIED_KEYS[field])));
  });

  protected readonly groups = computed((): readonly GroupView[] =>
    this.report().unmatched.map((group) => ({
      kind: group.kind,
      kindKey: KIND_KEYS[group.kind],
      names: group.names.map((name) => ({
        name: name.name,
        occurrences: name.occurrences,
        repeated: name.occurrences > 1,
        reasonKey: REASON_KEYS[name.reason],
        tone: REASON_TONES[name.reason],
      })),
    })),
  );
}
