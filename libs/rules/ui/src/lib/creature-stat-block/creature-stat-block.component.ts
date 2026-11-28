import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Badge, Heading, HeadingLevel, injectTranslate, LocaleFormat, Stack, Text } from '@pioneer/frontier';

import { TraitChip } from '../trait-chip/trait-chip.component';
import { StatBlockLayout } from './creature-stat-block';
import type { StatBlockCreature, StatBlockView, StatLine, StrikeLine } from './creature-stat-block';
import { statBlockView } from './creature-stat-block-view';
import { StatAbilitiesView } from './stat-abilities.component';
import { StatItemsView } from './stat-items.component';
import { StatLinesView } from './stat-lines.component';
import { StatPassagesView } from './stat-passages.component';
import { StatSpellcastingView } from './stat-spellcasting.component';
import { StatStrikesView } from './stat-strikes.component';

/**
 * A creature's stat block, laid out like the printed one: name, level and traits, perception, languages, skills,
 * attributes, defences, speeds, Strikes, abilities, spellcasting and items. Parts the creature lacks are left out.
 * `layout` is `preview` in the content browser's preview tier, which keeps to the numbers a glance needs. Spells and
 * items link through the page's rich text links. Presentational: the caller finds the creature.
 *
 * ```html
 * <pio-creature-stat-block [creature]="creature" layout="full" />
 * ```
 */
@Component({
  selector: 'pio-creature-stat-block',
  imports: [
    Badge,
    Heading,
    StatAbilitiesView,
    StatItemsView,
    StatLinesView,
    StatPassagesView,
    StatSpellcastingView,
    StatStrikesView,
    Stack,
    Text,
    TraitChip,
  ],
  templateUrl: './creature-stat-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatureStatBlockView {
  public readonly creature = input.required<StatBlockCreature>();
  public readonly layout = input<StatBlockLayout>(StatBlockLayout.Full);
  /** The level of the creature's name, and of the headings in its text. */
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  readonly #i18n = inject(TranslocoService);
  readonly #format = inject(LocaleFormat);
  readonly #messages = injectTranslate();

  /** Whether the layout shows the whole stat block rather than the numbers a glance needs. */
  protected readonly full = computed((): boolean => this.layout() !== StatBlockLayout.Preview);

  protected readonly view = computed((): StatBlockView => {
    this.#messages();
    this.#format.locale();

    return statBlockView(this.creature(), {
      translate: (key, params) => this.#i18n.translate(key, params),
      number: (value, options) => this.#format.number(value, options),
      list: (items, type) => this.#format.list(items, type),
      listParts: (items, type) => this.#format.listParts(items, type),
      distance: (feet) => this.#format.distance(feet),
    });
  });

  /** Perception, then the languages, skills and attributes the preview leaves out. */
  protected readonly headLines = computed((): ReadonlyArray<StatLine> => {
    const { senses, details } = this.view();

    return this.full() ? [...senses, ...details] : senses;
  });

  /** The Strikes, without the prose after their damage in the preview. */
  protected readonly strikes = computed((): ReadonlyArray<StrikeLine> => {
    const { strikes } = this.view();

    return this.full()
      ? strikes
      : strikes.map((strike): StrikeLine => ({
          summary: strike.summary,
          tags: strike.tags,
          damage: strike.damage,
          effects: undefined,
        }));
  });
}
