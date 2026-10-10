import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Link, List, ListItem, Page, Stack, Surface, Text } from '@pioneer/frontier';

import { LEGAL_BOOKS } from './legal-books';
import { ORC_ATTRIBUTION } from './orc-attribution';

/**
 * Licensing notices for the Pathfinder content Pioneer serves (Paizo Community Use, ORC and Foundry pf2e) and the
 * books that content cites.
 */
@Component({
  selector: 'pio-legal-page',
  imports: [Heading, Link, List, ListItem, Page, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './legal-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {
  protected readonly attribution = ORC_ATTRIBUTION;
  protected readonly books = LEGAL_BOOKS;
}
