import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Link, List, ListItem, Page, PageBody, PageHeader, Stack, Surface, Text } from '@pioneer/frontier';

import { ContentCaches } from './content-caches/content-caches.component';
import { LEGAL_BOOKS } from './legal-books';
import { LEGAL_IMPORTS } from './legal-imports';
import { OGL_ATTRIBUTION } from './ogl-attribution';
import { ORC_ATTRIBUTION } from './orc-attribution';

/**
 * Licensing notices for the Pathfinder content Pioneer serves (Paizo Community Use, ORC, OGL and Foundry pf2e) and the
 * books that content cites.
 */
@Component({
  selector: 'pio-legal-page',
  imports: [
    ContentCaches,
    Heading,
    Link,
    List,
    ListItem,
    Page,
    PageBody,
    PageHeader,
    Stack,
    Surface,
    Text,
    TranslocoPipe,
  ],
  templateUrl: './legal-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  protected readonly attribution = ORC_ATTRIBUTION;
  protected readonly oglAttribution = OGL_ATTRIBUTION;
  protected readonly books = LEGAL_BOOKS;
  protected readonly imports = LEGAL_IMPORTS;
}
