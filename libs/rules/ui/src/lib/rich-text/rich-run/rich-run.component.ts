import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Text } from '@pioneer/frontier';
import { TextMark } from '@pioneer/rules/sdk';
import type { TextNode } from '@pioneer/rules/sdk';

/** A run of text with its marks: emphasis, strong importance, or both. Always text, never markup. */
@Component({
  selector: 'pio-rich-run',
  imports: [Text],
  templateUrl: './rich-run.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichRun {
  public readonly node = input.required<TextNode>();

  protected readonly emphasis = computed((): boolean => this.node().marks?.includes(TextMark.Emphasis) ?? false);
  protected readonly strong = computed((): boolean => this.node().marks?.includes(TextMark.Strong) ?? false);
}
