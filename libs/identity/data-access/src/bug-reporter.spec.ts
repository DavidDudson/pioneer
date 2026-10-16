import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { IdentityContract, ReportText } from '@pioneer/identity/domain';
import { Locale, Uuid } from '@pioneer/shared/kernel';
import { ApiClient, LocalePreferences } from '@pioneer/shared/web';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { APP_VERSION, BugReporter } from './bug-reporter';

const CHARACTER_ID = Uuid.parse('0b9ab0c4-1d0a-4a5e-8d0d-0d3f0c1d2e3f');

interface Request {
  readonly params: object;
  readonly body: object;
}

interface Setup {
  readonly reporter: BugReporter;
  readonly call: Mock<(endpoint: unknown, request: Request) => Promise<object>>;
}

async function setup(): Promise<Setup> {
  const call = vi.fn<(endpoint: unknown, request: Request) => Promise<object>>(async () => ({}));
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', children: [] }]),
      { provide: ApiClient, useValue: { call } },
      { provide: LocalePreferences, useValue: { ui: (): Locale => Locale.English } },
      { provide: APP_VERSION, useValue: '1.4.0' },
    ],
  });
  return { reporter: TestBed.inject(BugReporter), call };
}

describe(BugReporter, () => {
  it('reports the page the reporter came from, with the app, locale and browser', async () => {
    const { reporter, call } = await setup();
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/characters/valeros/build?tab=feats');
    await router.navigateByUrl('/account/report-bug');

    await reporter.submit({ description: ReportText.parse('It broke'), steps: ReportText.parse('') });

    expect(call).toHaveBeenCalledWith(IdentityContract.reportBug, {
      params: {},
      body: {
        route: '/characters/valeros/build?tab=feats',
        appVersion: '1.4.0',
        locale: Locale.English,
        userAgent: navigator.userAgent,
        description: 'It broke',
        steps: '',
      },
    });
  });

  it('reports the form itself when it was opened directly', async () => {
    const { reporter, call } = await setup();
    await TestBed.inject(Router).navigateByUrl('/account/report-bug');

    await reporter.submit({ description: ReportText.parse('It broke'), steps: ReportText.parse('') });

    expect(call.mock.calls[0]?.[1].body).toMatchObject({ route: '/account/report-bug' });
  });

  it('attaches the character the reporter was looking at', async () => {
    const { reporter, call } = await setup();
    await TestBed.inject(Router).navigateByUrl('/characters/valeros');

    await reporter.submit({
      description: ReportText.parse('It broke'),
      steps: ReportText.parse(''),
      characterId: CHARACTER_ID,
    });

    expect(call.mock.calls[0]?.[1].body).toMatchObject({ characterId: CHARACTER_ID });
  });
});
