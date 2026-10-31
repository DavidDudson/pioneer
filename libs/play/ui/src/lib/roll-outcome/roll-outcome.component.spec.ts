import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { BlockKind, InlineKind, RichTextString } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import type { OutcomeView } from '../roll-view';
import { OutcomeKind } from '../roll-view';
import { providePlayUiI18nTesting } from '../testing/provide-play-ui-testing';
import { RollOutcome } from './roll-outcome.component';

async function render(outcome: OutcomeView): Promise<ComponentFixture<RollOutcome>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ providers: [providePlayUiI18nTesting()] });
  const fixture = TestBed.createComponent(RollOutcome);
  fixture.componentRef.setInput('outcome', outcome);
  await fixture.whenStable();
  return fixture;
}

function textOf(fixture: ComponentFixture<RollOutcome>): string {
  return (fixture.nativeElement as HTMLElement).textContent.replaceAll(/\s+/gu, ' ').trim();
}

describe(RollOutcome, () => {
  it('words a basic save from its message key', async () => {
    const fixture = await render({ kind: OutcomeKind.Message, key: 'roll.outcome.basicSave.success' });
    expect(textOf(fixture)).toBe('Takes half damage');
  });

  it('shows the paragraph the check gives for the degree', async () => {
    const text = RichTextString.parse('You flee for 1 round.');
    const fixture = await render({
      kind: OutcomeKind.Text,
      text: [{ type: BlockKind.Paragraph, content: [{ type: InlineKind.Text, text }] }],
    });
    expect(textOf(fixture)).toBe('You flee for 1 round.');
  });
});
