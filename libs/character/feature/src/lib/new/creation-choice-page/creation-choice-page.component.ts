import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Grid, Link, Page, PageBody, PageHeader, Stack, Surface, Text } from '@pioneer/frontier';

interface CreationChoice {
  readonly path: string;
  readonly title: string;
  readonly description: string;
}

/** The ways to make a character, one card each. Keys are spelled out in full (no runtime key building). */
const CHOICES: readonly CreationChoice[] = [
  {
    path: 'import',
    title: 'character.new.import.title',
    description: 'character.new.import.description',
  },
  {
    path: 'generate',
    title: 'character.new.generate.title',
    description: 'character.new.generate.description',
  },
  {
    path: 'create',
    title: 'character.new.create.title',
    description: 'character.new.create.description',
  },
];

/** `/characters/new`: choose between importing, generating and creating a character. */
@Component({
  selector: 'pio-creation-choice-page',
  imports: [Grid, Link, Page, PageBody, PageHeader, Stack, Surface, Text, TranslocoPipe],
  templateUrl: './creation-choice-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreationChoicePage {
  protected readonly choices = CHOICES;
}
