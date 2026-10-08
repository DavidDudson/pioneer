import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Heading, Link, Page, Stack, Surface, Text } from '@pioneer/frontier';

/** Licensing notices for the Pathfinder content Pioneer serves: Paizo Community Use, ORC and Foundry pf2e. */
@Component({
  selector: 'pio-legal-page',
  imports: [Heading, Link, Page, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './legal-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalPage {}
