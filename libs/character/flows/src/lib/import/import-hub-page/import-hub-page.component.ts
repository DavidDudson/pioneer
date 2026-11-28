import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, Link, Page, PageBody, PageHeader, Stack, Surface, Text } from '@pioneer/frontier';

interface ImportSource {
  readonly path: string;
  readonly title: string;
  readonly description: string;
}

const SOURCES: readonly ImportSource[] = [
  {
    path: 'pathbuilder',
    title: 'character.import.hub.pathbuilder.title',
    description: 'character.import.hub.pathbuilder.description',
  },
  {
    path: 'backup',
    title: 'character.import.hub.backup.title',
    description: 'character.import.hub.backup.description',
  },
];

/** `/characters/new/import`: choose between importing from Pathbuilder and from a Pioneer backup. */
@Component({
  selector: 'pio-import-hub-page',
  imports: [Grid, Link, Page, PageBody, PageHeader, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './import-hub-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportHubPage {
  protected readonly sources = SOURCES;
}
