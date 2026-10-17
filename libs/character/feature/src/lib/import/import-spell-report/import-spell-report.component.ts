import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Disclosure, List, ListItem, Stack, Text } from '@pioneer/frontier';
import { SpellGapReason } from '@pioneer/interop/pathbuilder';
import type { SpellGap } from '@pioneer/interop/pathbuilder';

/** The message that says why a spell went in no slot. */
const REASON_KEYS = {
  [SpellGapReason.NoEntry]: 'character.import.result.spellGapReason.noEntry',
  [SpellGapReason.NoSlot]: 'character.import.result.spellGapReason.noSlot',
  [SpellGapReason.NotGranted]: 'character.import.result.spellGapReason.notGranted',
  [SpellGapReason.NotOffered]: 'character.import.result.spellGapReason.notOffered',
} as const satisfies Record<SpellGapReason, string>;

/** A spell no slot took, as the list shows it: the rank goes in as text for the message to select on. */
interface GapView {
  readonly name: string;
  readonly caster: string;
  readonly rank: string;
  readonly reasonKey: string;
}

/** Where a Pathbuilder import's spells found no slot: each spell that matched content but fits none the character has. */
@Component({
  selector: 'pio-import-spell-report',
  imports: [Disclosure, List, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './import-spell-report.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSpellReport {
  public readonly spellGaps = input.required<readonly SpellGap[]>();

  protected readonly anyGaps = computed(() => this.spellGaps().length > 0);

  protected readonly gaps = computed((): readonly GapView[] =>
    this.spellGaps().map(({ name, caster, rank, reason }) => ({
      name,
      caster,
      rank: String(rank),
      reasonKey: REASON_KEYS[reason],
    })),
  );
}
