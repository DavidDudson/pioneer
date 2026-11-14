import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Badge, Heading, HeadingLevel, Stack, Text } from '@pioneer/frontier';
import type { RichText } from '@pioneer/rules/sdk';

import { RichTextView } from '../rich-text/rich-text.component';
import { SourceLineView } from '../source-line/source-line.component';
import { EntryEaseOptionsView } from './entry-ease-options.component';
import { EntryEffectsView } from './entry-effects.component';
import { EntryEndingsView } from './entry-endings.component';
import type { EntryPreview } from './entry-preview';
import { EntryPreviewMessage } from './entry-preview-messages';
import { EntryRanksView } from './entry-ranks.component';
import { EntryValuesView } from './entry-values.component';

/** The generic card of an entry: name, level, traits, `summary` and sources. `pio-entry-preview` picks it. */
@Component({
  selector: 'pio-entry-card',
  imports: [
    Badge,
    EntryEffectsView,
    EntryEaseOptionsView,
    EntryEndingsView,
    EntryRanksView,
    EntryValuesView,
    Heading,
    RichTextView,
    SourceLineView,
    Stack,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './entry-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntryCardView {
  public readonly preview = input.required<EntryPreview>();
  public readonly summary = input.required<RichText>();
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly Message = EntryPreviewMessage;
}
