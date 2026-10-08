import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { kernelMessages, ValidationMessage } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { provideI18n } from './i18n';

async function setup(): Promise<TranslocoService> {
  TestBed.configureTestingModule({ providers: [provideI18n({ en: async () => kernelMessages })] });
  await TestBed.inject(ApplicationInitStatus).donePromise;
  return TestBed.inject(TranslocoService);
}

describe('kernel en messages', () => {
  it('format length limits with plurals', async () => {
    const i18n = await setup();
    expect(i18n.translate(ValidationMessage.TooSmall, { origin: 'string', minimum: 1 })).toBe(
      'Use at least 1 character.',
    );
    expect(i18n.translate(ValidationMessage.TooBig, { origin: 'string', maximum: 60 })).toBe(
      'Use at most 60 characters.',
    );
  });

  it('format numeric limits', async () => {
    const i18n = await setup();
    expect(i18n.translate(ValidationMessage.TooBig, { origin: 'number', maximum: 20 })).toBe('Must be 20 or less.');
    expect(i18n.translate(ValidationMessage.Decimal, { precision: 4, scale: 2 })).toBe(
      'Use at most 4 digits, 2 after the decimal point.',
    );
  });

  it('format by format kind', async () => {
    const i18n = await setup();
    expect(i18n.translate(ValidationMessage.InvalidFormat, { format: 'date' })).toBe('Not a valid date.');
    expect(i18n.translate(ValidationMessage.InvalidFormat, { format: 'email' })).toBe('Not in the expected format.');
  });
});
