import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { Segmented, Stack } from '@pioneer/frontier';
import type { SelectOption } from '@pioneer/frontier';
import { Proficiency } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';
import { filter, merge } from 'rxjs';

import { NO_ORIGIN_NAMES } from '../origin-chain/origin-names';
import type { OriginNames } from '../origin-chain/origin-names';
import { StatisticsView } from '../statistics/statistics.component';
import type { NamedStatistic } from '../statistics/statistics.component';
import { SkillsMessage } from './skills-messages';

/** Which statistics the panel lists: the standard skills, or the character's Lores. */
const SkillsTab = { Skills: 'skills', Lores: 'lores' } as const;
type SkillsTab = (typeof SkillsTab)[keyof typeof SkillsTab];

/** A Lore's selector starts so: `skill:lore:sailing`. */
const LORE_PREFIX = 'skill:lore:';

/** The word a Lore's name ends with, which the Lores tab makes redundant: "Architecture Lore" reads "Architecture". */
const LORE_SUFFIX = /\s+Lore$/u;

/**
 * Every skill and Lore of a character in one panel, the skills and the Lores on tabs of their own, so each list is
 * short enough to read whole. Each row is a `pio-statistics` row laid out as a skill's: the name, the rank badge and the
 * roll, whose popover holds the breakdown. The Lores tab lists the character's own Lores only.
 *
 * Read-only and presentational (ADR-0028): the caller passes the statistics in display order, or undefined while
 * they load.
 *
 * ```html
 * <pio-skills [statistics]="skills()" [entryNames]="names()" />
 * ```
 */
@Component({
  selector: 'pio-skills',
  imports: [Segmented, Stack, StatisticsView, TranslocoPipe],
  templateUrl: './skills.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsView {
  /** Undefined while loading. */
  public readonly statistics = input.required<readonly NamedStatistic[] | undefined>();
  /** Display names of the entries the breakdown lines come from. */
  public readonly entryNames = input<ReadonlyMap<ContentId, string>>(new Map());
  /** Names for what the breakdown lines' origin chains refer to beyond entries. */
  public readonly originNames = input<OriginNames>(NO_ORIGIN_NAMES);

  protected readonly Message = SkillsMessage;
  protected readonly Tab = SkillsTab;
  protected readonly tab = signal<SkillsTab>(SkillsTab.Skills);

  readonly #i18n = inject(TranslocoService);
  /** Ticks when the locale changes or a message scope finishes loading. */
  readonly #loaded = this.#i18n.events$.pipe(filter((event) => event.type === 'translationLoadSuccess'));
  readonly #messages = toSignal(merge(this.#i18n.langChanges$, this.#loaded));

  protected readonly options = computed((): readonly SelectOption<SkillsTab>[] => {
    this.#messages();
    return [
      { value: SkillsTab.Skills, label: this.#i18n.translate(SkillsMessage.Skills) },
      { value: SkillsTab.Lores, label: this.#i18n.translate(SkillsMessage.Lores) },
    ];
  });

  /**
   * The statistics of the tab shown; undefined while they load. The Lores tab lists only the character's own: those it
   * has any rank in, not every Lore the content defines, each named without its "Lore" since the tab says it.
   */
  protected readonly shown = computed((): readonly NamedStatistic[] | undefined => {
    const lores = this.tab() === SkillsTab.Lores;
    const own = this.statistics()?.filter(
      ({ result, rank }) =>
        result.selector.startsWith(LORE_PREFIX) === lores &&
        (!lores || (rank !== undefined && rank !== Proficiency.Untrained)),
    );
    return lores ? own?.map((each) => ({ ...each, name: each.name.replace(LORE_SUFFIX, '') })) : own;
  });
}
