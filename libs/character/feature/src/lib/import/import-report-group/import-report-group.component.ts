import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, BadgeTone, Disclosure, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { ImportKind, MatchStatus } from '@pioneer/interop/pathbuilder';
import type { ReportGroup } from '@pioneer/interop/pathbuilder';

const KIND_KEYS: Readonly<Record<ImportKind, string>> = {
  [ImportKind.Ancestry]: 'character.import.kind.ancestry',
  [ImportKind.Heritage]: 'character.import.kind.heritage',
  [ImportKind.Background]: 'character.import.kind.background',
  [ImportKind.Class]: 'character.import.kind.class',
  [ImportKind.Deity]: 'character.import.kind.deity',
  [ImportKind.Feat]: 'character.import.kind.feat',
  [ImportKind.ClassFeature]: 'character.import.kind.classFeature',
  [ImportKind.Spell]: 'character.import.kind.spell',
  [ImportKind.Ritual]: 'character.import.kind.ritual',
  [ImportKind.Item]: 'character.import.kind.item',
  [ImportKind.Language]: 'character.import.kind.language',
};

const STATUS_KEYS: Readonly<Record<MatchStatus, string>> = {
  [MatchStatus.Matched]: 'character.import.status.matched',
  [MatchStatus.Unmatched]: 'character.import.status.unmatched',
  [MatchStatus.KindNotLoaded]: 'character.import.status.kindNotLoaded',
};

const STATUS_TONES: Readonly<Record<MatchStatus, BadgeTone>> = {
  [MatchStatus.Matched]: BadgeTone.Success,
  [MatchStatus.Unmatched]: BadgeTone.Warning,
  [MatchStatus.KindNotLoaded]: BadgeTone.Neutral,
};

/** One name as the list shows it. */
interface RowView {
  readonly name: string;
  readonly occurrences: number;
  readonly repeated: boolean;
  readonly statusKey: string;
  readonly tone: BadgeTone;
}

/** One kind's names in the import report, collapsed to a "Feats · 3 of 32 matched" line until opened. */
@Component({
  selector: 'pio-import-report-group',
  imports: [Badge, Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-report-group.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportReportGroup {
  public readonly group = input.required<ReportGroup>();

  protected readonly kindKey = computed(() => KIND_KEYS[this.group().kind]);
  protected readonly total = computed(() => this.group().rows.length);
  protected readonly matched = computed(
    () => this.group().rows.filter((row) => row.status === MatchStatus.Matched).length,
  );
  protected readonly rows = computed((): readonly RowView[] =>
    this.group().rows.map((row) => ({
      name: row.name,
      occurrences: row.occurrences,
      repeated: row.occurrences > 1,
      statusKey: STATUS_KEYS[row.status],
      tone: STATUS_TONES[row.status],
    })),
  );
}
