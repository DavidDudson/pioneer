import { booleanAttribute, ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { LucidePackageSearch } from '@lucide/angular';
import { EmptyState, HeadingLevel } from '@pioneer/frontier';
import { EntryPreviewView } from '@pioneer/rules/ui';
import type { EntryPreview } from '@pioneer/rules/ui';

const EntryViewMessage = {
  MissingTitle: 'contentBrowser.entry.missingTitle',
  MissingDescription: 'contentBrowser.entry.missingDescription',
} as const;

/**
 * An entry of the content browser: its card, or a note that no entry has the link. The entry page and every tier of
 * the browser show an entry through this, so they read the same.
 */
@Component({
  selector: 'pio-content-entry-view',
  imports: [EmptyState, EntryPreviewView, TranslocoPipe],
  templateUrl: './content-entry-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentEntryView {
  /** The entry, or `undefined` for a link no entry has. */
  public readonly card = input.required<EntryPreview | undefined>();
  /** The whole description rather than its opening, for a page that is about the entry. */
  public readonly full = input(false, { transform: booleanAttribute });
  public readonly headingLevel = input<HeadingLevel>(HeadingLevel.Three);

  protected readonly Message = EntryViewMessage;
  protected readonly missingIcon = LucidePackageSearch;
}
