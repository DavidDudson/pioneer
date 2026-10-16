import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { AppVersion, BugReportSubmission, IdentityContract, ReportedRoute, UserAgent } from '@pioneer/identity/domain';
import type { BugReportReceipt, ReportText } from '@pioneer/identity/domain';
import type { Uuid } from '@pioneer/shared/kernel';
import { ApiClient, LocalePreferences } from '@pioneer/shared/web';

const DEV_VERSION = 'dev';
const UNKNOWN_USER_AGENT = 'unknown';

/** What a build calls itself in a report; builds that don't say are reported as `dev`. */
export const APP_VERSION = new InjectionToken<string>('APP_VERSION', {
  providedIn: 'root',
  factory: (): string => DEV_VERSION,
});

/** What the reporter wrote. The rest of a report is read from the app. */
export interface BugReportDraft {
  readonly description: ReportText;
  readonly steps: ReportText;
  /** The character they were looking at, if any. */
  readonly characterId?: Uuid | undefined;
  /** Whether a frozen copy of that character goes with the report; off unless the reporter agreed. */
  readonly shareCharacter?: boolean | undefined;
}

/**
 * Files a bug report as the signed-in user. The report page is only a form, so the route recorded
 * is the page the reporter came from, and the locale, build and browser come from the app.
 */
@Injectable({ providedIn: 'root' })
export class BugReporter {
  readonly #api = inject(ApiClient);
  readonly #router = inject(Router);
  readonly #locale = inject(LocalePreferences);
  readonly #document = inject(DOCUMENT);
  readonly #version = inject(APP_VERSION);

  /** The page the reporter was on before the form, or the form itself when it was opened directly. */
  public cameFrom(): ReportedRoute {
    const previous = this.#router.lastSuccessfulNavigation()?.previousNavigation?.finalUrl;
    const url = previous === undefined ? this.#router.url : this.#router.serializeUrl(previous);
    return ReportedRoute.parse(url);
  }

  /** The browser, or `unknown` where there is no window or it names nothing. */
  #userAgent(): string {
    const reported = this.#document.defaultView?.navigator.userAgent ?? '';
    return reported === '' ? UNKNOWN_USER_AGENT : reported;
  }

  public async submit(draft: BugReportDraft): Promise<BugReportReceipt> {
    const body = BugReportSubmission.parse({
      route: this.cameFrom(),
      appVersion: AppVersion.parse(this.#version),
      locale: this.#locale.ui(),
      userAgent: UserAgent.parse(this.#userAgent()),
      description: draft.description,
      steps: draft.steps,
      characterId: draft.characterId,
      shareCharacter: draft.shareCharacter,
    });
    return this.#api.call(IdentityContract.reportBug, { params: {}, body });
  }
}
