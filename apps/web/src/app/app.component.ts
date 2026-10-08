import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Link, Shell, Stack, Text } from '@pioneer/frontier';

@Component({
  selector: 'pio-root',
  imports: [Link, RouterOutlet, Shell, Stack, Text, TranslocoPipe],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
