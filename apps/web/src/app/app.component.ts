import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Link, Shell, Stack } from '@pioneer/frontier';

@Component({
  selector: 'pio-root',
  imports: [Link, RouterLink, RouterOutlet, Shell, Stack],
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
