import { TestBed } from '@angular/core/testing';
import type { ComponentFixture } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { frontierMessages } from '@pioneer/frontier';
import { ActionOriginKind, ActionStatus } from '@pioneer/rules/engine';
import { rulesMessages } from '@pioneer/rules/messages';
import { ActionCost, ActionMode, ContentId } from '@pioneer/rules/sdk';
import { ActionUser } from '@pioneer/rules/ui';
import type { ActionLine, ActionUse } from '@pioneer/rules/ui';
import { provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';

import en from '../../../i18n/en.json';
import { SheetTriggerPromptList } from './sheet-trigger-prompt-list.component';
import type { TriggerPromptRow } from './trigger-prompt-view';

const SHIELD = ContentId.parse('00000000-0000-4000-8000-000000000001');
const SHRUG = ContentId.parse('00000000-0000-4000-8000-000000000002');

function row(id: ContentId, name: string, over: Partial<ActionLine> = {}): TriggerPromptRow {
  const line: ActionLine = {
    id,
    name,
    traits: [],
    cost: ActionCost.Reaction,
    modes: [ActionMode.Encounter],
    origin: { kind: ActionOriginKind.Basic },
    source: undefined,
    status: ActionStatus.Available,
    reasons: [],
    roll: undefined,
    priority: undefined,
    dormant: false,
    ...over,
  };

  return { line, costKey: 'rules.facet.actionCost.reaction', uses: undefined };
}

async function render(
  rows: ReadonlyArray<TriggerPromptRow>,
  use: (request: ActionUse) => Promise<void> = recorder(),
): Promise<ComponentFixture<SheetTriggerPromptList>> {
  TestBed.configureTestingModule({
    providers: [
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient()),
      { provide: ActionUser, useValue: { use } },
    ],
  });
  TestBed.inject(TranslocoService).setTranslation({ character: en, ...rulesMessages }, 'en', { merge: true });

  const fixture: ComponentFixture<SheetTriggerPromptList> = TestBed.createComponent(SheetTriggerPromptList);
  fixture.componentRef.setInput('rows', rows);
  await fixture.whenStable();

  return fixture;
}

/** The element a rendered component sits in. */
function hostOf(fixture: ComponentFixture<SheetTriggerPromptList>): HTMLElement {
  // SAFETY: nativeElement is typed any, and a component host is an HTMLElement under the DOM test environment.
  return fixture.nativeElement as HTMLElement;
}

function text(fixture: ComponentFixture<SheetTriggerPromptList>): string {
  return hostOf(fixture).textContent;
}

/** What using an ability does, recorded. */
function recorder(): (request: ActionUse) => Promise<void> {
  return vi.fn<(request: ActionUse) => Promise<void>>(async () => {});
}

describe(SheetTriggerPromptList, () => {
  it('lists one ability with its cost', async () => {
    const fixture = await render([row(SHIELD, 'Shield Block')]);

    expect(text(fixture)).toContain('A triggered ability needs your answer');
    expect(text(fixture)).toContain('Shield Block');
    expect(text(fixture)).toContain('Reaction');
  });

  it('lists several abilities in one prompt', async () => {
    const fixture = await render([row(SHIELD, 'Shield Block'), row(SHRUG, 'Shrug Off', { cost: ActionCost.Free })]);
    const content = text(fixture);

    expect(content).toContain('2 triggered abilities need your answer');
    expect(content).toContain('Shield Block');
    expect(content).toContain('Shrug Off');
  });

  it('says why a spent reaction cannot be used, and offers no Use button for it', async () => {
    const spent = row(SHIELD, 'Shield Block', {
      affordable: false,
      reasons: [{ key: 'rules.actions.turn.reactionSpent' }],
    });

    const fixture = await render([spent]);

    expect(text(fixture)).toContain('Reaction already spent.');
    expect(text(fixture)).not.toContain('Use');
  });

  it('uses an ability like any other action when accepted', async () => {
    const use = recorder();
    const fixture = await render([row(SHIELD, 'Shield Block')], use);
    const button = hostOf(fixture).querySelector('pio-use-buttons button');

    button?.dispatchEvent(new Event('click'));
    await fixture.whenStable();

    expect(use).toHaveBeenCalledTimes(1);
  });

  it('tells which ability was declined', async () => {
    const fixture = await render([row(SHIELD, 'Shield Block')]);
    const declined: Array<ContentId> = [];
    fixture.componentInstance.declined.subscribe((id) => {
      declined.push(id);
    });

    const buttons = [...hostOf(fixture).querySelectorAll('button')];
    buttons.find((button) => button.textContent.includes('Decline'))?.dispatchEvent(new Event('click'));

    expect(declined).toStrictEqual([SHIELD]);
  });
});
