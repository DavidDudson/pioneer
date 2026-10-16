import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { frontierMessages } from '@pioneer/frontier';
import { BugReporter, SessionStore } from '@pioneer/identity/data-access';
import type { BugReportDraft } from '@pioneer/identity/data-access';
import { HttpStatus } from '@pioneer/shared/kernel';
import { ApiError, PREFERENCE_STORAGE, provideI18n } from '@pioneer/shared/web';
import { provideTanStackQuery, QueryClient } from '@tanstack/angular-query-experimental';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { identityRoutes } from '../identity.routes';

const CHARACTER_ID = '0b9ab0c4-1d0a-4a5e-8d0d-0d3f0c1d2e3f';

interface Rendered {
  readonly harness: RouterTestingHarness;
  readonly submit: Mock<(draft: BugReportDraft) => Promise<object>>;
}

async function render(url: string, failure?: Error, snapshotTaken = true): Promise<Rendered> {
  const submit = vi.fn<(draft: BugReportDraft) => Promise<object>>(async () => {
    if (failure !== undefined) {
      throw failure;
    }
    return { snapshotTaken };
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'account', children: identityRoutes }]),
      provideI18n({ en: async () => frontierMessages }),
      provideTanStackQuery(new QueryClient({ defaultOptions: { queries: { retry: false } } })),
      { provide: PREFERENCE_STORAGE, useValue: undefined },
      {
        provide: SessionStore,
        useValue: {
          whenKnown: async (): Promise<object> => ({ displayName: 'Amiri' }),
        },
      },
      { provide: BugReporter, useValue: { submit } },
    ],
  });
  const harness = await RouterTestingHarness.create(url);
  await harness.fixture.whenStable();
  return { harness, submit };
}

function root(harness: RouterTestingHarness): HTMLElement {
  const element = harness.routeNativeElement;
  if (element === null) {
    throw new Error('Expected a page to render');
  }
  return element;
}

function field(page: HTMLElement, label: string): HTMLTextAreaElement {
  const match = [...page.querySelectorAll('label')].find((each) => each.textContent.includes(label));
  const control =
    match?.htmlFor === undefined ? undefined : page.querySelector<HTMLTextAreaElement>(`#${match.htmlFor}`);
  if (control === undefined || control === null) {
    throw new Error(`No field labelled ${label}`);
  }
  return control;
}

/** Types into a field, then lets the page settle as it does between a user's keystrokes. */
async function write(harness: RouterTestingHarness, label: string, text: string): Promise<void> {
  const control = field(root(harness), label);
  control.value = text;
  control.dispatchEvent(new Event('input'));
  await harness.fixture.whenStable();
}

async function send(harness: RouterTestingHarness): Promise<void> {
  const page = root(harness);
  const button = [...page.querySelectorAll('button')].find((each) => each.type === 'submit');
  if (button === undefined) {
    throw new Error('No submit button');
  }
  button.click();
  await harness.fixture.whenStable();
}

describe('ReportBugPage', () => {
  it('sends what the reporter wrote and says so beside the form', async () => {
    const { harness, submit } = await render('/account/report-bug');
    const page = root(harness);
    await write(harness, 'What went wrong?', 'The sheet will not save');
    await write(harness, 'Steps to see it', 'Raise Strength, then reload');
    await send(harness);

    await vi.waitFor(() => {
      expect(page.textContent).toContain('Your report was sent');
    });
    expect(submit).toHaveBeenCalledWith({
      description: 'The sheet will not save',
      steps: 'Raise Strength, then reload',
      characterId: undefined,
      shareCharacter: false,
    });
    expect(page.textContent).not.toContain('Character attached');
    expect(field(page, 'What went wrong?').value).toBe('');
  });

  it('names the character a sheet attached and sends its id', async () => {
    const { harness, submit } = await render(`/account/report-bug?character=${CHARACTER_ID}&name=Valeros`);
    const page = root(harness);
    expect(page.textContent).toContain('Character attached');
    expect(page.textContent).toContain('A copy of Valeros as it is now goes to the maintainers');

    await write(harness, 'What went wrong?', 'The AC is wrong');
    await send(harness);

    await vi.waitFor(() => {
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ characterId: CHARACTER_ID }));
    });
  });

  it('shares the character by default and sends that', async () => {
    const { harness, submit } = await render(`/account/report-bug?character=${CHARACTER_ID}&name=Valeros`);
    await write(harness, 'What went wrong?', 'The AC is wrong');
    await send(harness);

    await vi.waitFor(() => {
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          characterId: CHARACTER_ID,
          shareCharacter: true,
        }),
      );
    });
  });

  it('sends the report without the character once the reporter unticks sharing', async () => {
    const { harness, submit } = await render(`/account/report-bug?character=${CHARACTER_ID}&name=Valeros`);
    const page = root(harness);
    const toggle = page.querySelector<HTMLElement>('fr-toggle-button-field button');
    toggle?.click();
    await harness.fixture.whenStable();
    await write(harness, 'What went wrong?', 'The AC is wrong');
    await send(harness);

    await vi.waitFor(() => {
      expect(submit).toHaveBeenCalledWith(expect.objectContaining({ shareCharacter: false }));
    });
    expect(page.textContent).toContain('Your report was sent.');
  });

  it('says so when the character could not be copied', async () => {
    const { harness } = await render(`/account/report-bug?character=${CHARACTER_ID}&name=Valeros`, undefined, false);
    const page = root(harness);
    await write(harness, 'What went wrong?', 'The AC is wrong');
    await send(harness);

    await vi.waitFor(() => {
      expect(page.textContent).toContain('but without the character');
    });
  });

  it('ignores an attached character without a usable id', async () => {
    const { harness } = await render('/account/report-bug?character=not-an-id&name=Valeros');
    expect(root(harness).textContent).not.toContain('Character attached');
  });

  it('asks for a description under the field and sends nothing without one', async () => {
    const { harness, submit } = await render('/account/report-bug');
    await send(harness);

    expect(submit).not.toHaveBeenCalled();
    expect(root(harness).querySelector('[role="alert"]')).not.toBeNull();
  });

  it('keeps what was written when the report could not be sent', async () => {
    const { harness } = await render('/account/report-bug', new Error('offline'));
    const page = root(harness);
    await write(harness, 'What went wrong?', 'The sheet will not save');
    await send(harness);

    await vi.waitFor(() => {
      expect(page.textContent).toContain('Could not send your report');
    });
    expect(field(page, 'What went wrong?').value).toBe('The sheet will not save');
    expect(page.textContent).not.toContain('Your report was sent');
  });

  it('says when too many reports were sent this hour', async () => {
    const { harness } = await render('/account/report-bug', new ApiError(HttpStatus.TooManyRequests, undefined));
    const page = root(harness);
    await write(harness, 'What went wrong?', 'Again');
    await send(harness);

    await vi.waitFor(() => {
      expect(page.textContent).toContain('You have sent a lot of reports this hour');
    });
  });
});
